"""Unit tests for the in-memory Walrus blob-store fake.

The real HTTP client (Step 4) is tested separately under the ``integration``
marker; here we only cover the fake used by the rest of the suite.
"""

from __future__ import annotations

import pytest

from langgraph_checkpoint_walrus.walrus_client import (
    BlobStore,
    InMemoryWalrusClient,
)


def test_store_then_read_round_trip() -> None:
    client = InMemoryWalrusClient()
    data = b"hello walrus" + bytes(range(256))
    blob_id = client.store(data)
    assert client.read(blob_id) == data


def test_identical_payloads_dedup() -> None:
    client = InMemoryWalrusClient()
    a = client.store(b"same")
    b = client.store(b"same")
    assert a == b
    assert len(client) == 1


def test_distinct_payloads_distinct_ids() -> None:
    client = InMemoryWalrusClient()
    assert client.store(b"one") != client.store(b"two")
    assert len(client) == 2


def test_read_unknown_raises() -> None:
    client = InMemoryWalrusClient()
    with pytest.raises(KeyError):
        client.read("does-not-exist")


def test_satisfies_blobstore_protocol() -> None:
    assert isinstance(InMemoryWalrusClient(), BlobStore)
