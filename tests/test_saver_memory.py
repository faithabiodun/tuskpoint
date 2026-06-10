"""WalrusSaver tests against the in-memory fake, driven through real LangGraph.

These prove the checkpointer interface end-to-end: a compiled graph persists
state through ``WalrusSaver``, resumes from the latest checkpoint, lists history,
and survives a *simulated* fresh process (a brand-new saver reading the same
blob store + threads cache).
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


def test_run_and_get_state(cache_path) -> None:
    saver = WalrusSaver(InMemoryWalrusClient(), threads_cache_path=cache_path)
    graph = build_graph(saver)
    config = {"configurable": {"thread_id": "t-run"}}

    result = graph.invoke({"value": 1, "log": []}, config)
    # 1 -> inc -> 2 -> double -> 4
    assert result["value"] == 4
    assert result["log"] == ["inc", "double"]

    snap = graph.get_state(config)
    assert snap.values["value"] == 4


def test_history_lists_multiple_checkpoints(cache_path) -> None:
    saver = WalrusSaver(InMemoryWalrusClient(), threads_cache_path=cache_path)
    graph = build_graph(saver)
    config = {"configurable": {"thread_id": "t-hist"}}
    graph.invoke({"value": 5, "log": []}, config)

    history = list(graph.get_state_history(config))
    # At least: initial, after inc, after double.
    assert len(history) >= 3
    # Newest first: most recent snapshot holds the final value.
    assert history[0].values["value"] == 12  # (5+1)*2


def test_resume_in_fresh_saver_shares_blob_store(cache_path) -> None:
    """A new saver instance over the same blob store + cache resumes state."""
    client = InMemoryWalrusClient()

    saver1 = WalrusSaver(client, threads_cache_path=cache_path)
    graph1 = build_graph(saver1)
    config = {"configurable": {"thread_id": "t-resume"}}
    graph1.invoke({"value": 10, "log": []}, config)

    # Simulate a fresh process: new saver, SAME blob store + threads cache file.
    saver2 = WalrusSaver(client, threads_cache_path=cache_path)
    graph2 = build_graph(saver2)
    snap = graph2.get_state(config)
    assert snap.values["value"] == 22  # (10+1)*2


def test_interrupt_then_resume(cache_path) -> None:
    """Interrupt before 'double', then resume and finish from the checkpoint."""
    client = InMemoryWalrusClient()
    saver = WalrusSaver(client, threads_cache_path=cache_path)

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
    graph = g.compile(checkpointer=saver, interrupt_before=["double"])

    config = {"configurable": {"thread_id": "t-interrupt"}}
    graph.invoke({"value": 3, "log": []}, config)

    # Paused before 'double': value is post-inc, not yet doubled.
    paused = graph.get_state(config)
    assert paused.values["value"] == 4
    assert paused.next == ("double",)

    # Resume in a brand-new saver (fresh "process") and finish.
    saver2 = WalrusSaver(client, threads_cache_path=cache_path)
    graph2 = g.compile(checkpointer=saver2, interrupt_before=["double"])
    final = graph2.invoke(None, config)
    assert final["value"] == 8  # 4 * 2
