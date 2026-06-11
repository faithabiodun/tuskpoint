"""Blob-store abstraction for TuskPoint's *exact* storage layer.

Two implementations share one tiny interface (:class:`BlobStore`):

* :class:`InMemoryWalrusClient` — a process-local dict fake used to prove the
  LangGraph checkpointer interface and in unit tests (Step 3).
* ``WalrusClient`` — the real HTTP client over the Walrus publisher/aggregator
  API, added in Step 4.

A blob store maps opaque ``blob_id`` strings to immutable byte payloads. The
saver gzips LangGraph-serialized checkpoints before handing them here, so this
layer deals only in raw bytes and knows nothing about checkpoints.
"""

from __future__ import annotations

import os
import hashlib
from typing import Protocol, runtime_checkable

import httpx


@runtime_checkable
class BlobStore(Protocol):
    """Minimal content store: write bytes, get an ID back; read by that ID.

    Implementations must be *immutable* and *content-addressable enough* that a
    returned ``blob_id`` always reads back byte-identical data. The real Walrus
    backend satisfies this; the in-memory fake mimics it.
    """

    def store(self, data: bytes) -> str:
        """Store ``data`` and return its blob ID."""
        ...

    def read(self, blob_id: str) -> bytes:
        """Return the bytes previously stored under ``blob_id``.

        Raises:
            KeyError: if no blob with that ID exists.
        """
        ...


class InMemoryWalrusClient:
    """A process-local stand-in for Walrus, backed by a plain dict.

    Blob IDs are the SHA-256 of the content (hex), so identical payloads collapse
    to one entry — exactly the dedup behavior the real Walrus exhibits with its
    ``alreadyCertified`` path. Use this to develop and test the saver without any
    network access.
    """

    def __init__(self) -> None:
        self._blobs: dict[str, bytes] = {}

    def store(self, data: bytes) -> str:
        """Store ``data`` under its content hash and return the blob ID."""
        blob_id = hashlib.sha256(data).hexdigest()
        self._blobs[blob_id] = data
        return blob_id

    def read(self, blob_id: str) -> bytes:
        """Return the bytes stored under ``blob_id``.

        Raises:
            KeyError: if the blob ID is unknown to this in-memory store.
        """
        if blob_id not in self._blobs:
            raise KeyError(f"blob not found: {blob_id}")
        return self._blobs[blob_id]

    def __len__(self) -> int:
        """Return the number of distinct blobs held (useful in tests)."""
        return len(self._blobs)


# Walrus **mainnet** endpoints. Env vars (WALRUS_PUBLISHER_URL /
# WALRUS_AGGREGATOR_URL) take precedence; the lists below provide one retry's
# worth of resilience against a flaky public node.
#
# Reads are public and free: any mainnet aggregator serves a content-addressed
# blob to anyone. Writes are NOT free — mainnet has no public, unauthenticated
# publisher, because storing a blob costs SUI (gas) + WAL (storage). The default
# below points at a community publisher (Staketab); for production you run your
# own publisher or use the upload relay with a funded key. See .env.example.
DEFAULT_PUBLISHERS = [
    "https://walrus-mainnet-publisher-1.staketab.org:443",
]
DEFAULT_AGGREGATORS = [
    "https://aggregator.walrus-mainnet.walrus.space",
    "https://walrus.globalstake.io",
    "https://walrus-mainnet-aggregator.nodes.guru",
]


class WalrusClient:
    """Real blob store over the Walrus HTTP API (publisher PUT / aggregator GET).

    Writes a blob with ``PUT {publisher}/v1/blobs?epochs=N`` and reads it back
    with ``GET {aggregator}/v1/blobs/{blob_id}``. Multiple publisher/aggregator
    URLs are tried in order so a single flaky public node doesn't fail the
    operation — satisfying the "clear error + one retry" requirement.

    Args:
        publisher_url: Override publisher base URL (else ``WALRUS_PUBLISHER_URL``
            then public fallbacks).
        aggregator_url: Override aggregator base URL (else ``WALRUS_AGGREGATOR_URL``
            then public fallbacks).
        epochs: Storage duration in Walrus epochs (how long the blob persists).
        timeout: Per-request timeout in seconds.
    """

    def __init__(
        self,
        publisher_url: str | None = None,
        aggregator_url: str | None = None,
        *,
        epochs: int = 5,
        timeout: float = 60.0,
    ) -> None:
        self.epochs = epochs
        self.timeout = httpx.Timeout(timeout)
        env_pub = publisher_url or os.getenv("WALRUS_PUBLISHER_URL")
        env_agg = aggregator_url or os.getenv("WALRUS_AGGREGATOR_URL")
        self.publishers = self._order(env_pub, DEFAULT_PUBLISHERS)
        self.aggregators = self._order(env_agg, DEFAULT_AGGREGATORS)

    @staticmethod
    def _order(preferred: str | None, fallbacks: list[str]) -> list[str]:
        """Return ``preferred`` first (if set), then the public fallbacks."""
        if preferred:
            return [preferred] + [u for u in fallbacks if u != preferred]
        return list(fallbacks)

    @staticmethod
    def _extract_blob_id(body: dict) -> str | None:
        """Pull the blob ID from a publisher response (new or already-certified)."""
        if "newlyCreated" in body:
            return body["newlyCreated"]["blobObject"]["blobId"]
        if "alreadyCertified" in body:
            return body["alreadyCertified"]["blobId"]
        return None

    def store(self, data: bytes) -> str:
        """Store ``data`` as a Walrus blob and return its blob ID.

        Tries each publisher in turn; raises ``RuntimeError`` listing the last
        error if all fail.
        """
        last_error: Exception | None = None
        for base in self.publishers:
            url = f"{base.rstrip('/')}/v1/blobs"
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.put(url, params={"epochs": self.epochs}, content=data)
                    resp.raise_for_status()
                    body = resp.json()
            except Exception as exc:  # noqa: BLE001 - try next node
                last_error = exc
                continue
            blob_id = self._extract_blob_id(body)
            if blob_id:
                return blob_id
            last_error = RuntimeError(f"publisher returned no blobId: {body}")
        raise RuntimeError(
            f"Walrus store failed on all publishers ({self.publishers}); "
            f"last error: {last_error}"
        )

    def read(self, blob_id: str) -> bytes:
        """Fetch a Walrus blob by ID, trying each aggregator once.

        Raises ``KeyError`` if the blob is reported missing by all aggregators,
        or ``RuntimeError`` for other transport failures.
        """
        last_error: Exception | None = None
        not_found = False
        for base in self.aggregators:
            url = f"{base.rstrip('/')}/v1/blobs/{blob_id}"
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.get(url)
                    if resp.status_code == 404:
                        not_found = True
                        continue
                    resp.raise_for_status()
                    return resp.content
            except Exception as exc:  # noqa: BLE001 - try next node
                last_error = exc
                continue
        if not_found and last_error is None:
            raise KeyError(f"blob not found on any aggregator: {blob_id}")
        raise RuntimeError(
            f"Walrus read failed on all aggregators ({self.aggregators}); "
            f"last error: {last_error}"
        )
