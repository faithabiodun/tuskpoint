"""``WalrusSaver`` — a LangGraph checkpointer backed by Walrus + a manifest.

Each checkpoint is packed into a single self-describing *envelope* (checkpoint,
its channel values, metadata, and pending writes), gzipped, and stored as one
immutable blob via a :class:`~langgraph_checkpoint_walrus.walrus_client.BlobStore`.
A per-thread :class:`~langgraph_checkpoint_walrus.manifest.ThreadManifest` maps
``checkpoint_id -> {blob_id, parent, timestamp, summary}`` and is itself stored
as a blob, re-uploaded on every save. The latest manifest blob ID for each
thread is cached locally in ``.walrus_threads.json`` so a fresh process can find
its way back to a thread's history.

Retrieval is ALWAYS exact: ``thread_id`` + ``checkpoint_id`` resolve through the
manifest to a specific blob. Semantic search lives in a separate layer.

Design note: unlike the Postgres/SQLite savers, channel values
are embedded in the checkpoint envelope rather than stored as separate
per-channel blobs. This keeps the blob count (and publisher round-trips) low and
makes exact retrieval a single fetch.
"""

from __future__ import annotations

import os
import json
import gzip
import time
import uuid
import base64
import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Iterator, AsyncIterator, Sequence

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import (
    WRITES_IDX_MAP,
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    SerializerProtocol,
    get_checkpoint_id,
    get_checkpoint_metadata,
)
from langgraph.checkpoint.base.id import uuid6

from .walrus_client import BlobStore, InMemoryWalrusClient
from .manifest import CheckpointEntry, ThreadManifest

DEFAULT_THREADS_CACHE = ".walrus_threads.json"
ENVELOPE_VERSION = 1


def _enc(typed: tuple[str, bytes]) -> list[str]:
    """Encode a serde ``(type, bytes)`` pair as JSON-safe ``[type, b64]``."""
    type_, data = typed
    return [type_, base64.b64encode(data).decode("ascii")]


def _dec(pair: list[str]) -> tuple[str, bytes]:
    """Decode a ``[type, b64]`` pair back to a serde ``(type, bytes)`` tuple."""
    type_, b64 = pair
    return (type_, base64.b64decode(b64.encode("ascii")))


def _sha256(blob: bytes) -> str:
    """Return the hex SHA-256 digest of ``blob`` (the exact stored bytes)."""
    return hashlib.sha256(blob).hexdigest()


class WalrusSaver(BaseCheckpointSaver[str]):
    """A ``BaseCheckpointSaver`` that persists checkpoints to a Walrus blob store.

    Args:
        client: The blob store backend. Pass an
            :class:`~langgraph_checkpoint_walrus.walrus_client.InMemoryWalrusClient`
            for tests, or the real HTTP client in production.
        serde: Optional serializer override (defaults to LangGraph's JSON+ serde).
        threads_cache_path: Path to the local JSON file caching each thread's
            latest manifest blob ID. Defaults to ``.walrus_threads.json`` in CWD.
        memwal_layer: Optional semantic layer (added in Step 5). When provided,
            its ``summarize_and_remember`` hook is called on each ``put`` to write
            a one-sentence summary to MemWal. ``None`` disables semantic writes.
    """

    def __init__(
        self,
        client: BlobStore | None = None,
        *,
        serde: SerializerProtocol | None = None,
        threads_cache_path: str = DEFAULT_THREADS_CACHE,
        memwal_layer: Any | None = None,
    ) -> None:
        super().__init__(serde=serde)
        self.client: BlobStore = client if client is not None else InMemoryWalrusClient()
        self.threads_cache_path = threads_cache_path
        self.memwal_layer = memwal_layer
        # Guards the local threads-cache file and in-process manifest cache.
        self._lock = threading.Lock()
        # thread_id -> latest manifest blob ID, mirrored to disk.
        self._manifest_ids: dict[str, str] = self._load_threads_cache()

    # ------------------------------------------------------------------
    # Local threads cache (latest manifest blob ID per thread)
    # ------------------------------------------------------------------

    def _load_threads_cache(self) -> dict[str, str]:
        """Load the thread_id -> manifest-blob-id map from disk (or empty)."""
        if not os.path.exists(self.threads_cache_path):
            return {}
        try:
            with open(self.threads_cache_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            return {str(k): str(v) for k, v in data.items()}
        except (json.JSONDecodeError, OSError):
            # Corrupt or unreadable cache: start fresh rather than crash.
            return {}

    def _save_threads_cache(self) -> None:
        """Persist the in-memory thread cache to disk atomically."""
        tmp = f"{self.threads_cache_path}.tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(self._manifest_ids, fh, indent=2, sort_keys=True)
        os.replace(tmp, self.threads_cache_path)

    # ------------------------------------------------------------------
    # Manifest load / store
    # ------------------------------------------------------------------

    def _load_manifest(self, thread_id: str) -> ThreadManifest:
        """Return the thread's manifest, fetching it from the blob store.

        Falls back to a fresh empty manifest if the thread is unknown or its
        cached manifest blob can't be read.
        """
        manifest_blob_id = self._manifest_ids.get(thread_id)
        if manifest_blob_id is None:
            return ThreadManifest(thread_id=thread_id)
        try:
            raw = self.client.read(manifest_blob_id)
            return ThreadManifest.from_json_bytes(raw)
        except KeyError:
            return ThreadManifest(thread_id=thread_id)

    def _store_manifest(self, manifest: ThreadManifest) -> str:
        """Store ``manifest`` as a blob, update caches, return its blob ID."""
        blob_id = self.client.store(manifest.to_json_bytes())
        with self._lock:
            self._manifest_ids[manifest.thread_id] = blob_id
            self._save_threads_cache()
        return blob_id

    def _read_blobs(self, blob_ids: Sequence[str]) -> dict[str, bytes | Exception]:
        """Fetch many blobs concurrently, returning ``blob_id -> bytes | error``.

        ``list`` and ``verify_trail`` walk a whole thread, which otherwise means
        one network round-trip per checkpoint, strictly back-to-back. Fanning the
        reads out across a small thread pool turns N sequential round-trips into
        roughly one — the blob store is content-addressed and stateless, so the
        order they complete in doesn't matter. Errors are captured per blob so a
        single bad read doesn't sink the others (``verify_trail`` reports them).
        """
        unique = list(dict.fromkeys(blob_ids))
        if len(unique) <= 1:
            results: dict[str, bytes | Exception] = {}
            for bid in unique:
                try:
                    results[bid] = self.client.read(bid)
                except Exception as exc:  # noqa: BLE001 - captured per blob
                    results[bid] = exc
            return results

        results = {}

        def _one(bid: str) -> tuple[str, bytes | Exception]:
            try:
                return bid, self.client.read(bid)
            except Exception as exc:  # noqa: BLE001 - captured per blob
                return bid, exc

        with ThreadPoolExecutor(max_workers=min(8, len(unique))) as pool:
            for bid, value in pool.map(_one, unique):
                results[bid] = value
        return results

    # ------------------------------------------------------------------
    # Envelope pack / unpack
    # ------------------------------------------------------------------

    def _pack_envelope(
        self,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        parent_checkpoint_id: str | None,
        checkpoint_ns: str,
    ) -> bytes:
        """Serialize a checkpoint (with channel values + metadata) to gzipped bytes."""
        c = dict(checkpoint)
        channel_values: dict[str, Any] = c.pop("channel_values", {}) or {}
        envelope = {
            "v": ENVELOPE_VERSION,
            "checkpoint": _enc(self.serde.dumps_typed(c)),
            "channel_values": {
                k: _enc(self.serde.dumps_typed(v)) for k, v in channel_values.items()
            },
            "metadata": _enc(self.serde.dumps_typed(metadata)),
            "parent_checkpoint_id": parent_checkpoint_id,
            "checkpoint_ns": checkpoint_ns,
            "writes": [],  # populated by put_writes via _append_writes
        }
        return gzip.compress(json.dumps(envelope).encode("utf-8"))

    def _unpack_envelope(self, raw: bytes) -> dict[str, Any]:
        """Inflate and JSON-decode a checkpoint envelope blob."""
        return json.loads(gzip.decompress(raw).decode("utf-8"))

    def _envelope_to_tuple(
        self, thread_id: str, checkpoint_ns: str, checkpoint_id: str, env: dict[str, Any]
    ) -> CheckpointTuple:
        """Rebuild a :class:`CheckpointTuple` from a decoded envelope."""
        checkpoint: Checkpoint = self.serde.loads_typed(_dec(env["checkpoint"]))
        channel_values = {
            k: self.serde.loads_typed(_dec(v))
            for k, v in env.get("channel_values", {}).items()
        }
        metadata = self.serde.loads_typed(_dec(env["metadata"]))
        parent_checkpoint_id = env.get("parent_checkpoint_id")

        pending_writes = [
            (w["task_id"], w["channel"], self.serde.loads_typed(_dec(w["value"])))
            for w in env.get("writes", [])
        ]

        return CheckpointTuple(
            config={
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                }
            },
            checkpoint={**checkpoint, "channel_values": channel_values},
            metadata=metadata,
            parent_config=(
                {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": parent_checkpoint_id,
                    }
                }
                if parent_checkpoint_id
                else None
            ),
            pending_writes=pending_writes,
        )

    # ------------------------------------------------------------------
    # Sync API
    # ------------------------------------------------------------------

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        """Persist a checkpoint and update the thread manifest.

        Stores the gzipped checkpoint envelope as a blob, records the mapping in
        the manifest, and (if a MemWal layer is configured) writes a one-sentence
        summary for later semantic recall.
        """
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id = checkpoint["id"]
        parent_checkpoint_id = config["configurable"].get("checkpoint_id")

        full_metadata = get_checkpoint_metadata(config, metadata)
        blob = self._pack_envelope(
            checkpoint, full_metadata, parent_checkpoint_id, checkpoint_ns
        )
        blob_sha256 = _sha256(blob)
        blob_id = self.client.store(blob)

        summary = ""
        if self.memwal_layer is not None:
            summary = self.memwal_layer.summarize_and_remember(
                thread_id=thread_id,
                checkpoint_id=checkpoint_id,
                checkpoint=checkpoint,
                metadata=full_metadata,
            )

        manifest = self._load_manifest(thread_id)
        manifest.add(
            checkpoint_id,
            CheckpointEntry(
                blob_id=blob_id,
                parent_checkpoint_id=parent_checkpoint_id,
                timestamp=checkpoint["ts"],
                summary=summary,
                checkpoint_ns=checkpoint_ns,
                blob_sha256=blob_sha256,
            ),
        )
        self._store_manifest(manifest)

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        }

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        """Attach pending writes to an already-stored checkpoint.

        Re-reads the checkpoint's blob, appends the writes (idempotently, keyed
        like the reference savers), and re-stores it, updating the manifest's
        blob ID for that checkpoint.
        """
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id = config["configurable"]["checkpoint_id"]

        manifest = self._load_manifest(thread_id)
        entry = manifest.get(checkpoint_id)
        if entry is None:
            # No checkpoint to attach to; nothing we can do without it.
            return

        env = self._unpack_envelope(self.client.read(entry.blob_id))
        existing = env.get("writes", [])
        # Build a set of (task_id, idx) keys already present for idempotency.
        present = {(w["task_id"], w["idx"]) for w in existing}

        for idx, (channel, value) in enumerate(writes):
            write_idx = WRITES_IDX_MAP.get(channel, idx)
            key = (task_id, write_idx)
            if write_idx >= 0 and key in present:
                continue
            existing.append(
                {
                    "task_id": task_id,
                    "idx": write_idx,
                    "channel": channel,
                    "value": _enc(self.serde.dumps_typed(value)),
                    "task_path": task_path,
                }
            )
            present.add(key)

        env["writes"] = existing
        new_blob = gzip.compress(json.dumps(env).encode("utf-8"))
        new_blob_id = self.client.store(new_blob)

        entry.blob_id = new_blob_id
        entry.blob_sha256 = _sha256(new_blob)
        manifest.add(checkpoint_id, entry)
        self._store_manifest(manifest)

    def get_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        """Fetch a checkpoint tuple by exact thread + checkpoint ID (or latest)."""
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        manifest = self._load_manifest(thread_id)

        checkpoint_id = get_checkpoint_id(config)
        if not checkpoint_id:
            checkpoint_id = manifest.latest_id()
        if not checkpoint_id:
            return None

        entry = manifest.get(checkpoint_id)
        if entry is None:
            return None

        env = self._unpack_envelope(self.client.read(entry.blob_id))
        return self._envelope_to_tuple(thread_id, checkpoint_ns, checkpoint_id, env)

    def list(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> Iterator[CheckpointTuple]:
        """List a thread's checkpoints newest-first, with optional filtering."""
        if config is None:
            # This backend indexes by thread; a thread_id is required to list.
            return
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        manifest = self._load_manifest(thread_id)

        before_id = get_checkpoint_id(before) if before else None

        # Resolve which checkpoints are in range first, then fetch their blobs
        # concurrently — one parallel batch instead of a read per checkpoint.
        candidates: list[tuple[str, Any]] = []
        for checkpoint_id in manifest.ordered_ids(newest_first=True):
            if before_id and checkpoint_id >= before_id:
                continue
            entry = manifest.get(checkpoint_id)
            if entry is None:
                continue
            candidates.append((checkpoint_id, entry))

        blobs = self._read_blobs([entry.blob_id for _, entry in candidates])

        count = 0
        for checkpoint_id, entry in candidates:
            raw = blobs.get(entry.blob_id)
            if isinstance(raw, Exception) or raw is None:
                # Skip an unreadable blob rather than aborting the whole listing.
                continue
            env = self._unpack_envelope(raw)
            tup = self._envelope_to_tuple(
                thread_id, checkpoint_ns, checkpoint_id, env
            )

            if filter and not all(
                tup.metadata.get(k) == v for k, v in filter.items()
            ):
                continue

            if limit is not None and count >= limit:
                break
            count += 1
            yield tup

    # ------------------------------------------------------------------
    # Async API — thin wrappers; the blob store is sync
    # ------------------------------------------------------------------

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        """Async wrapper around :meth:`put`."""
        return self.put(config, checkpoint, metadata, new_versions)

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        """Async wrapper around :meth:`put_writes`."""
        return self.put_writes(config, writes, task_id, task_path)

    async def aget_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        """Async wrapper around :meth:`get_tuple`."""
        return self.get_tuple(config)

    async def alist(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> AsyncIterator[CheckpointTuple]:
        """Async wrapper around :meth:`list`."""
        for item in self.list(config, filter=filter, before=before, limit=limit):
            yield item

    # ------------------------------------------------------------------
    # Semantic search (delegates to the MemWal layer, if configured)
    # ------------------------------------------------------------------

    def search_history(self, query: str, *, limit: int = 5) -> list[dict[str, Any]]:
        """Semantically search this saver's checkpoint summaries via MemWal.

        Args:
            query: Natural-language question about past state.
            limit: Max number of hits to return.

        Returns:
            A list of ``{"text", "distance"}`` dicts (nearest first), or an empty
            list if no MemWal layer is configured.
        """
        if self.memwal_layer is None:
            return []
        return self.memwal_layer.search_history(query, limit=limit)

    # ------------------------------------------------------------------
    # Forking — "git branch" for agent runs
    # ------------------------------------------------------------------

    def fork(
        self,
        source_thread_id: str,
        source_checkpoint_id: str,
        new_thread_id: str,
    ) -> dict[str, Any]:
        """Branch a new thread from an existing checkpoint.

        Loads the exact ``source_checkpoint_id`` from ``source_thread_id`` and
        writes its state as the genesis checkpoint of ``new_thread_id``. The new
        thread starts byte-identical to the fork point; running an agent on it
        explores a different path while the original line stays untouched. The
        new genesis entry records ``forked_from`` so the manifest describes a
        tree of runs, not just a single line.

        Args:
            source_thread_id: Thread that holds the checkpoint to branch from.
            source_checkpoint_id: Exact checkpoint to branch from.
            new_thread_id: Thread ID for the new branch. Must not already exist.

        Returns:
            ``{"source", "new_thread_id", "checkpoint_id", "blob_id",
            "forked_from"}``.

        Raises:
            KeyError: if the source checkpoint cannot be found.
            ValueError: if ``new_thread_id`` already has checkpoints.
        """
        source_config: RunnableConfig = {
            "configurable": {
                "thread_id": source_thread_id,
                "checkpoint_id": source_checkpoint_id,
            }
        }
        source = self.get_tuple(source_config)
        if source is None:
            raise KeyError(
                f"checkpoint not found: {source_thread_id}:{source_checkpoint_id}"
            )

        existing = self._load_manifest(new_thread_id)
        if existing.entries:
            raise ValueError(
                f"thread already exists: {new_thread_id} "
                f"({len(existing.entries)} checkpoint(s)). Fork into a fresh id."
            )

        forked_from = f"{source_thread_id}:{source_checkpoint_id}"
        new_checkpoint_id = str(uuid.uuid1())
        ts = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())

        # Genesis checkpoint for the new thread: same state, new identity, no
        # parent (the lineage to the source is captured by ``forked_from``).
        checkpoint: Checkpoint = {
            **source.checkpoint,
            "id": new_checkpoint_id,
            "ts": ts,
        }
        metadata: CheckpointMetadata = {
            **(source.metadata or {}),
            "source": "fork",
            "forked_from": forked_from,
            # This is the genesis of a new thread, so its step resets to 0; the
            # link back to the source line is carried by ``forked_from``.
            "step": 0,
        }

        blob = self._pack_envelope(checkpoint, metadata, None, "")
        blob_sha256 = _sha256(blob)
        blob_id = self.client.store(blob)

        summary = ""
        if self.memwal_layer is not None:
            summary = self.memwal_layer.summarize_and_remember(
                thread_id=new_thread_id,
                checkpoint_id=new_checkpoint_id,
                checkpoint=checkpoint,
                metadata=metadata,
            )

        manifest = self._load_manifest(new_thread_id)
        manifest.add(
            new_checkpoint_id,
            CheckpointEntry(
                blob_id=blob_id,
                parent_checkpoint_id=None,
                timestamp=ts,
                summary=summary,
                checkpoint_ns="",
                forked_from=forked_from,
                blob_sha256=blob_sha256,
            ),
        )
        self._store_manifest(manifest)

        return {
            "source": forked_from,
            "new_thread_id": new_thread_id,
            "checkpoint_id": new_checkpoint_id,
            "blob_id": blob_id,
            "forked_from": forked_from,
        }

    # ------------------------------------------------------------------
    # Rollback — "undo" to an earlier checkpoint on the SAME thread
    # ------------------------------------------------------------------

    def rollback_to(
        self, thread_id: str, checkpoint_id: str
    ) -> dict[str, Any]:
        """Restore an earlier checkpoint's state as the new head of its thread.

        Unlike :meth:`fork` (which branches into a *new* thread), rollback stays
        on the same thread: it reads the exact ``checkpoint_id`` and writes its
        state back as a brand-new checkpoint at the head. Crucially this is
        *append-only* — the intervening checkpoints are never deleted, so the
        thread's verifiable trail stays intact and the rollback itself is an
        auditable event. The new head records ``rolled_back_from`` (the
        checkpoint it restored) and parents off the previous head, so the history
        reads: ...-> bad state -> (rollback) -> restored good state.

        This is the durable version of LangGraph's "update state to a past
        checkpoint": after a rollback, ``get_tuple``/``resume`` return the
        restored state and the agent continues from there.

        Args:
            thread_id: The thread to roll back.
            checkpoint_id: The earlier checkpoint whose state to restore.

        Returns:
            ``{"thread_id", "checkpoint_id" (the new head), "restored_from",
            "blob_id", "rolled_back_from"}``.

        Raises:
            KeyError: if ``checkpoint_id`` is not found in the thread.
        """
        manifest = self._load_manifest(thread_id)
        target = manifest.get(checkpoint_id)
        if target is None:
            raise KeyError(
                f"checkpoint not found: {thread_id}:{checkpoint_id}"
            )

        source = self.get_tuple(
            {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_id": checkpoint_id,
                }
            }
        )
        if source is None:
            raise KeyError(
                f"checkpoint not found: {thread_id}:{checkpoint_id}"
            )

        prev_head = manifest.latest_id()
        # Use a time-ordered UUIDv6 like LangGraph so this new checkpoint sorts
        # as the thread's latest (lexical max == chronological latest).
        new_checkpoint_id = str(uuid6(clock_seq=-2))
        ts = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())

        # New head: the restored state under a fresh identity, parented off the
        # previous head so the rollback is a visible step in the chain.
        checkpoint: Checkpoint = {
            **source.checkpoint,
            "id": new_checkpoint_id,
            "ts": ts,
        }
        metadata: CheckpointMetadata = {
            **(source.metadata or {}),
            "source": "rollback",
            "rolled_back_from": checkpoint_id,
        }

        blob = self._pack_envelope(checkpoint, metadata, prev_head, "")
        blob_sha256 = _sha256(blob)
        blob_id = self.client.store(blob)

        summary = ""
        if self.memwal_layer is not None:
            summary = self.memwal_layer.summarize_and_remember(
                thread_id=thread_id,
                checkpoint_id=new_checkpoint_id,
                checkpoint=checkpoint,
                metadata=metadata,
            )

        manifest.add(
            new_checkpoint_id,
            CheckpointEntry(
                blob_id=blob_id,
                parent_checkpoint_id=prev_head,
                timestamp=ts,
                summary=summary,
                checkpoint_ns="",
                rolled_back_from=checkpoint_id,
                blob_sha256=blob_sha256,
            ),
        )
        self._store_manifest(manifest)

        return {
            "thread_id": thread_id,
            "checkpoint_id": new_checkpoint_id,
            "restored_from": checkpoint_id,
            "blob_id": blob_id,
            "rolled_back_from": checkpoint_id,
        }

    # ------------------------------------------------------------------
    # Verifiable audit trail — "flight recorder" for agent runs
    # ------------------------------------------------------------------

    def verify_trail(self, thread_id: str) -> dict[str, Any]:
        """Cryptographically verify a thread's blob chain, step by step.

        For each checkpoint (oldest first) this re-fetches the blob from the
        Walrus aggregator, recomputes its SHA-256, and compares the result to the
        ``blob_sha256`` recorded in the manifest at write time. This is a content
        integrity check layered on top of Walrus's own content-addressing — not a
        new cryptographic primitive — but it gives a self-contained, byte-level
        proof that the stored bytes are exactly what was written.

        Per-step ``status``:

        * ``PASS``  — a stored hash exists and the recomputed hash matches.
        * ``FAIL``  — a stored hash exists but the recomputed hash differs, or the
          blob could not be fetched/unpacked. The trail is TAMPERED.
        * ``UNVERIFIED`` — no hash was stored at write time (checkpoint predates
          integrity hashing). Reported honestly; never counted as a pass.

        Args:
            thread_id: The thread whose chain to verify.

        Returns:
            ``{"thread_id", "ok", "checkpoint_count", "verified",
            "tampered_count", "steps"[]}`` where each step is
            ``{"checkpoint_id", "blob_id", "stored_hash", "recomputed_hash",
            "status"}``. ``ok`` is true only when at least one checkpoint was
            verified and no checkpoint FAILed.
        """
        manifest = self._load_manifest(thread_id)
        steps: list[dict[str, Any]] = []
        verified = 0
        tampered = 0

        ordered = list(manifest.ordered_ids(newest_first=False))
        # Fetch every checkpoint blob concurrently up front, then verify locally.
        blobs = self._read_blobs(
            [e.blob_id for cid in ordered if (e := manifest.get(cid)) is not None]
        )

        for cid in ordered:
            entry = manifest.get(cid)
            assert entry is not None  # ids come from the manifest itself
            stored_hash = entry.blob_sha256
            recomputed_hash: str | None = None
            raw = blobs.get(entry.blob_id)

            if isinstance(raw, Exception) or raw is None:
                # Blob unreadable: if we had a baseline to check, that's a FAIL;
                # otherwise there's nothing we could have proven anyway.
                status = "FAIL" if stored_hash else "UNVERIFIED"
            else:
                recomputed_hash = _sha256(raw)
                if stored_hash is None:
                    status = "UNVERIFIED"
                elif recomputed_hash == stored_hash:
                    status = "PASS"
                else:
                    status = "FAIL"

            if status == "PASS":
                verified += 1
            elif status == "FAIL":
                tampered += 1

            steps.append(
                {
                    "checkpoint_id": cid,
                    "blob_id": entry.blob_id,
                    "stored_hash": stored_hash,
                    "recomputed_hash": recomputed_hash,
                    "status": status,
                }
            )

        total = len(steps)
        return {
            "thread_id": thread_id,
            # Honest gate: proven if at least one checkpoint PASSed and none
            # FAILed. An all-UNVERIFIED thread has nothing proven, so ok=false.
            "ok": verified > 0 and tampered == 0,
            "checkpoint_count": total,
            "verified": verified,
            "tampered_count": tampered,
            "steps": steps,
        }

    def get_next_version(self, current: str | None, channel: None = None) -> str:
        """Return the next monotonic channel version string.

        Mirrors the reference savers: a zero-padded counter plus random suffix so
        versions sort correctly and rarely collide.
        """
        import random

        if current is None:
            current_v = 0
        elif isinstance(current, int):
            current_v = current
        else:
            current_v = int(current.split(".")[0])
        next_v = current_v + 1
        next_h = random.random()
        return f"{next_v:032}.{next_h:016}"
