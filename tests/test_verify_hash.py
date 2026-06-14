"""SHA-256 integrity proof in ``verify_trail`` (in-memory, no network).

Feature 1: every checkpoint blob is hashed at write time and the hash stored in
the manifest. ``verify_trail`` re-fetches each blob, recomputes its SHA-256, and
compares — proving the stored bytes are byte-for-byte what was written. These
tests drive a real LangGraph run through ``WalrusSaver`` over the in-memory
Walrus fake, then assert the hashes exist, that a clean trail PASSes, and that a
single corrupted blob is caught as a FAIL.
"""

from __future__ import annotations

import operator
from typing import Annotated
from typing_extensions import TypedDict

import pytest
from langgraph.graph import StateGraph, START, END

from langgraph_checkpoint_walrus import WalrusSaver, InMemoryWalrusClient


class State(TypedDict):
    """Tiny accumulating state for the test graph."""

    value: int
    log: Annotated[list[str], operator.add]


def build_graph(saver: WalrusSaver):
    """Compile a 2-node graph (inc -> double) checkpointed by ``saver``."""

    def inc(state: State) -> State:
        return {"value": state["value"] + 1, "log": ["inc"]}

    def double(state: State) -> State:
        return {"value": state["value"] * 2, "log": ["double"]}

    g = StateGraph(State)
    g.add_node("inc", inc)
    g.add_node("double", double)
    g.add_edge(START, "inc")
    g.add_edge("inc", "double")
    g.add_edge("double", END)
    return g.compile(checkpointer=saver)


@pytest.fixture
def cache_path(tmp_path):
    """A temp path for the .walrus_threads.json cache, isolated per test."""
    return str(tmp_path / "threads.json")


def _run(client: InMemoryWalrusClient, cache_path: str, thread_id: str) -> WalrusSaver:
    """Run the graph once and return the saver (so tests can inspect it)."""
    saver = WalrusSaver(client, threads_cache_path=cache_path)
    graph = build_graph(saver)
    graph.invoke(
        {"value": 5, "log": []},
        {"configurable": {"thread_id": thread_id}},
    )
    return saver


def test_entries_get_hash(cache_path) -> None:
    """Every manifest entry records a SHA-256 of its stored blob."""
    client = InMemoryWalrusClient()
    saver = _run(client, cache_path, "t-hash")

    manifest = saver._load_manifest("t-hash")
    assert manifest.entries  # ran at least one checkpoint
    for entry in manifest.entries.values():
        assert entry.blob_sha256 is not None
        assert len(entry.blob_sha256) == 64  # hex SHA-256
        # The recorded hash matches the actual bytes in the store.
        import hashlib

        raw = client.read(entry.blob_id)
        assert hashlib.sha256(raw).hexdigest() == entry.blob_sha256


def test_verify_all_pass(cache_path) -> None:
    """A clean trail verifies: every step PASS, ok=true, nothing tampered."""
    client = InMemoryWalrusClient()
    saver = _run(client, cache_path, "t-ok")

    report = saver.verify_trail("t-ok")
    assert report["ok"] is True
    assert report["tampered_count"] == 0
    assert report["checkpoint_count"] == report["verified"]
    assert report["verified"] >= 1
    for step in report["steps"]:
        assert step["status"] == "PASS"
        assert step["stored_hash"] is not None
        assert step["recomputed_hash"] == step["stored_hash"]


def test_tamper_detected(cache_path) -> None:
    """Corrupting one stored blob is caught: that step FAILs, ok flips false."""
    client = InMemoryWalrusClient()
    saver = _run(client, cache_path, "t-tamper")

    manifest = saver._load_manifest("t-tamper")
    ordered = manifest.ordered_ids(newest_first=False)
    assert len(ordered) >= 2

    # Tamper with exactly one checkpoint's stored bytes, under its own blob_id,
    # so the fetch still succeeds but the recomputed hash no longer matches.
    victim_cid = ordered[len(ordered) // 2]
    victim_blob_id = manifest.get(victim_cid).blob_id
    client._blobs[victim_blob_id] = client._blobs[victim_blob_id] + b"corruption"

    report = saver.verify_trail("t-tamper")
    assert report["ok"] is False
    assert report["tampered_count"] == 1

    by_cid = {s["checkpoint_id"]: s for s in report["steps"]}
    assert by_cid[victim_cid]["status"] == "FAIL"
    assert by_cid[victim_cid]["recomputed_hash"] != by_cid[victim_cid]["stored_hash"]
    # Every other checkpoint still passes — tampering is localized, not global.
    for cid, step in by_cid.items():
        if cid != victim_cid:
            assert step["status"] == "PASS"
