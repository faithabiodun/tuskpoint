"""Durable, auditable rollback on the same thread (in-memory, no network).

Feature 2: ``rollback_to`` restores an earlier checkpoint's state as a brand-new
head of the SAME thread. It is append-only — intervening checkpoints survive, so
the verifiable trail stays intact and the rollback is itself a recorded step.
These tests drive a real LangGraph run, roll back to an earlier checkpoint, and
assert the restored state, the preserved history, the recorded lineage, and that
the rollback's own blob still verifies.
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


def _run(saver: WalrusSaver, thread_id: str) -> None:
    build_graph(saver).invoke(
        {"value": 5, "log": []}, {"configurable": {"thread_id": thread_id}}
    )


def test_rollback_restores_earlier_state(cache_path) -> None:
    """Rolling back to an early checkpoint makes its state the live head."""
    client = InMemoryWalrusClient()
    saver = WalrusSaver(client, threads_cache_path=cache_path)
    _run(saver, "t-rb")

    manifest = saver._load_manifest("t-rb")
    ordered = manifest.ordered_ids(newest_first=False)
    assert len(ordered) >= 3
    early_id = ordered[0]  # the very first (pre-inc) checkpoint

    # State at the early checkpoint, captured before rollback for comparison.
    early = saver.get_tuple(
        {"configurable": {"thread_id": "t-rb", "checkpoint_id": early_id}}
    )
    early_value = early.checkpoint["channel_values"].get("value")

    result = saver.rollback_to("t-rb", early_id)
    assert result["restored_from"] == early_id
    assert result["rolled_back_from"] == early_id

    # The latest checkpoint (newest) is now the rollback head with early state.
    head = saver.get_tuple({"configurable": {"thread_id": "t-rb"}})
    assert head.checkpoint["id"] == result["checkpoint_id"]
    assert head.checkpoint["channel_values"].get("value") == early_value
    assert head.metadata["source"] == "rollback"
    assert head.metadata["rolled_back_from"] == early_id


def test_rollback_is_append_only(cache_path) -> None:
    """History is preserved: rollback adds a head, never deletes prior steps."""
    client = InMemoryWalrusClient()
    saver = WalrusSaver(client, threads_cache_path=cache_path)
    _run(saver, "t-keep")

    before = saver._load_manifest("t-keep").ordered_ids(newest_first=False)
    early_id = before[0]

    result = saver.rollback_to("t-keep", early_id)

    after = saver._load_manifest("t-keep").ordered_ids(newest_first=False)
    # Every prior checkpoint still exists, plus exactly one new head.
    assert set(before).issubset(set(after))
    assert len(after) == len(before) + 1
    assert result["checkpoint_id"] in after
    # The new head parents off the previous head (the rollback is a real step).
    head_entry = saver._load_manifest("t-keep").get(result["checkpoint_id"])
    assert head_entry.parent_checkpoint_id == before[-1]
    assert head_entry.rolled_back_from == early_id


def test_rollback_head_verifies(cache_path) -> None:
    """The rollback's own blob is hashed and passes verify_trail."""
    client = InMemoryWalrusClient()
    saver = WalrusSaver(client, threads_cache_path=cache_path)
    _run(saver, "t-rbverify")

    early_id = saver._load_manifest("t-rbverify").ordered_ids(newest_first=False)[0]
    result = saver.rollback_to("t-rbverify", early_id)

    report = saver.verify_trail("t-rbverify")
    assert report["ok"] is True
    assert report["tampered_count"] == 0
    by_cid = {s["checkpoint_id"]: s for s in report["steps"]}
    assert by_cid[result["checkpoint_id"]]["status"] == "PASS"


def test_rollback_unknown_checkpoint_raises(cache_path) -> None:
    """Rolling back to a non-existent checkpoint raises KeyError."""
    client = InMemoryWalrusClient()
    saver = WalrusSaver(client, threads_cache_path=cache_path)
    _run(saver, "t-miss")

    with pytest.raises(KeyError):
        saver.rollback_to("t-miss", "does-not-exist")
