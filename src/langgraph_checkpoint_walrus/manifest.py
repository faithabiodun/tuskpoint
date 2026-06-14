"""Per-thread manifest mapping checkpoint IDs to their Walrus blobs.

The manifest is the index that makes *exact* retrieval possible: given a
``thread_id`` + ``checkpoint_id`` we look up the blob ID and fetch that exact
checkpoint — never a fuzzy/semantic match. The manifest is itself serialized to
JSON and stored as a Walrus blob, re-uploaded on every save; the latest
manifest blob ID per thread is cached locally (see :mod:`saver`).

Checkpoint IDs in LangGraph are time-ordered UUIDv6 strings, so lexical sort of
the IDs equals chronological order — we rely on that for "latest" lookups.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict


@dataclass
class CheckpointEntry:
    """One checkpoint's bookkeeping within a thread manifest.

    Attributes:
        blob_id: Walrus blob ID holding the gzipped, serialized checkpoint payload.
        parent_checkpoint_id: The previous checkpoint in this thread, or ``None``
            for the first checkpoint.
        timestamp: ISO-8601 creation time copied from the checkpoint.
        summary: One-sentence natural-language description (filled by the MemWal
            layer in Step 5; empty string until then).
        checkpoint_ns: LangGraph checkpoint namespace (usually "").
        forked_from: When this checkpoint is the genesis of a fork, the
            ``"{thread_id}:{checkpoint_id}"`` it was branched from; ``None`` for
            normal checkpoints. Lets the manifest describe a tree of runs, not
            just a single line.
        blob_sha256: Hex SHA-256 of the exact gzipped blob bytes, computed at
            write time. ``verify_trail`` re-fetches the blob and recomputes this
            to prove the stored bytes are unchanged. ``None`` for checkpoints
            written before integrity hashing existed (reported as UNVERIFIED).
        rolled_back_from: When this checkpoint is the head produced by a
            rollback, the ``checkpoint_id`` whose state it restored; ``None`` for
            normal checkpoints. Rollback is append-only, so this records the undo
            as an auditable event without erasing the intervening history.
    """

    blob_id: str
    parent_checkpoint_id: str | None
    timestamp: str
    summary: str = ""
    checkpoint_ns: str = ""
    forked_from: str | None = None
    blob_sha256: str | None = None
    rolled_back_from: str | None = None


@dataclass
class ThreadManifest:
    """The full index for a single thread.

    Attributes:
        thread_id: The LangGraph thread this manifest indexes.
        entries: Mapping of ``checkpoint_id`` -> :class:`CheckpointEntry`.
    """

    thread_id: str
    entries: dict[str, CheckpointEntry] = field(default_factory=dict)

    # --- mutation -------------------------------------------------------

    def add(self, checkpoint_id: str, entry: CheckpointEntry) -> None:
        """Insert or overwrite the entry for ``checkpoint_id``."""
        self.entries[checkpoint_id] = entry

    # --- lookups --------------------------------------------------------

    def get(self, checkpoint_id: str) -> CheckpointEntry | None:
        """Return the entry for ``checkpoint_id``, or ``None`` if absent."""
        return self.entries.get(checkpoint_id)

    def latest_id(self) -> str | None:
        """Return the most recent checkpoint ID, or ``None`` if empty.

        Relies on LangGraph's time-ordered checkpoint IDs: the lexical max is
        the chronological latest.
        """
        if not self.entries:
            return None
        return max(self.entries.keys())

    def ordered_ids(self, *, newest_first: bool = True) -> list[str]:
        """Return all checkpoint IDs in chronological order."""
        return sorted(self.entries.keys(), reverse=newest_first)

    # --- serialization --------------------------------------------------

    def to_json_bytes(self) -> bytes:
        """Serialize the manifest to compact UTF-8 JSON bytes for Walrus."""
        payload = {
            "thread_id": self.thread_id,
            "entries": {
                cid: asdict(entry) for cid, entry in self.entries.items()
            },
        }
        return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode(
            "utf-8"
        )

    @classmethod
    def from_json_bytes(cls, data: bytes) -> "ThreadManifest":
        """Reconstruct a :class:`ThreadManifest` from its JSON byte form."""
        payload = json.loads(data.decode("utf-8"))
        entries = {
            cid: CheckpointEntry(**entry)
            for cid, entry in payload.get("entries", {}).items()
        }
        return cls(thread_id=payload["thread_id"], entries=entries)
