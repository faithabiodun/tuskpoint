"""Cross-agent handoff: export a checkpoint, adopt it elsewhere (in-memory).

Feature 4: ``handoff_checkpoint`` emits a small portable descriptor (blob id +
SHA-256 + provenance); ``adopt_checkpoint`` re-fetches that blob, verifies the
hash, and writes it as the genesis of a *new* thread (a different agent picking
up where the first left off). The two agents share only the public Walrus blob
store — no copied state, and a tampered blob is rejected before it becomes state.
These tests use the in-memory client (which two savers can share, modelling two
agents over the same Walrus) so they run with no network.
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
def shared_client():
    """One in-memory Walrus shared by both 'agents' (like one real Walrus)."""
    return InMemoryWalrusClient()


def _agent_a(client, tmp_path):
    """Agent A: runs the graph and is ready to hand a checkpoint off."""
    saver = WalrusSaver(client, threads_cache_path=str(tmp_path / "a.json"))
    build_graph(saver).invoke(
        {"value": 5, "log": []}, {"configurable": {"thread_id": "agent-a"}}
    )
    return saver


def test_handoff_descriptor_has_hash(shared_client, tmp_path) -> None:
    """The handoff descriptor carries the blob id and its integrity hash."""
    saver_a = _agent_a(shared_client, tmp_path)
    latest = saver_a._load_manifest("agent-a").latest_id()

    desc = saver_a.handoff_checkpoint("agent-a", latest, to_agent="agent-b")
    assert desc["source"] == f"agent-a:{latest}"
    assert desc["blob_id"]
    assert desc["blob_sha256"] and len(desc["blob_sha256"]) == 64
    assert desc["to_agent"] == "agent-b"


def test_adopt_restores_state_in_new_agent(shared_client, tmp_path) -> None:
    """Agent B adopts the handoff and gets Agent A's exact state, verified."""
    saver_a = _agent_a(shared_client, tmp_path)
    latest = saver_a._load_manifest("agent-a").latest_id()
    a_value = saver_a.get_tuple(
        {"configurable": {"thread_id": "agent-a"}}
    ).checkpoint["channel_values"].get("value")

    desc = saver_a.handoff_checkpoint("agent-a", latest, to_agent="agent-b")

    # Agent B: a separate saver over the SAME shared Walrus store.
    saver_b = WalrusSaver(shared_client, threads_cache_path=str(tmp_path / "b.json"))
    result = saver_b.adopt_checkpoint(desc, "agent-b")
    assert result["verified"] is True
    assert result["adopted_from"] == f"agent-a:{latest}"

    head = saver_b.get_tuple({"configurable": {"thread_id": "agent-b"}})
    assert head.checkpoint["id"] == result["checkpoint_id"]
    assert head.checkpoint["channel_values"].get("value") == a_value
    assert head.metadata["adopted_from"] == f"agent-a:{latest}"

    # The adopted thread verifies on its own.
    report = saver_b.verify_trail("agent-b")
    assert report["ok"] is True


def test_adopt_rejects_tampered_blob(shared_client, tmp_path) -> None:
    """A blob corrupted in transit fails the integrity gate, never adopted."""
    saver_a = _agent_a(shared_client, tmp_path)
    latest = saver_a._load_manifest("agent-a").latest_id()
    desc = saver_a.handoff_checkpoint("agent-a", latest)

    # Corrupt the underlying blob's bytes (under its existing id) after handoff.
    shared_client._blobs[desc["blob_id"]] = (
        shared_client._blobs[desc["blob_id"]] + b"tampered"
    )

    saver_b = WalrusSaver(shared_client, threads_cache_path=str(tmp_path / "b.json"))
    with pytest.raises(ValueError, match="integrity check FAILED"):
        saver_b.adopt_checkpoint(desc, "agent-b")
    # Nothing was adopted: the new thread stays empty.
    assert not saver_b._load_manifest("agent-b").entries


def test_adopt_into_existing_thread_rejected(shared_client, tmp_path) -> None:
    """Adopting into a thread that already has checkpoints is refused."""
    saver_a = _agent_a(shared_client, tmp_path)
    latest = saver_a._load_manifest("agent-a").latest_id()
    desc = saver_a.handoff_checkpoint("agent-a", latest)

    saver_b = WalrusSaver(shared_client, threads_cache_path=str(tmp_path / "b.json"))
    saver_b.adopt_checkpoint(desc, "agent-b")  # first adoption ok
    with pytest.raises(ValueError, match="already exists"):
        saver_b.adopt_checkpoint(desc, "agent-b")  # second into same id refused
