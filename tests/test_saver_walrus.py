"""Integration tests against the real Walrus network (marked ``integration``).

Run explicitly with:

    pytest -m integration

These hit live Walrus publishers/aggregators and are skipped by the default
suite. They prove the real blob round-trip and a full WalrusSaver persist/resume
across independent saver instances (a stand-in for separate processes).
"""

from __future__ import annotations

import operator
import uuid
from typing import Annotated
from typing_extensions import TypedDict

import pytest
from langgraph.graph import StateGraph, START, END

from langgraph_checkpoint_walrus import WalrusClient, WalrusSaver

pytestmark = pytest.mark.integration


class _State(TypedDict):
    """Module-level state (Py3.14 forward-ref friendly) for the integration graph."""

    value: int
    log: Annotated[list[str], operator.add]


def _build_graph(saver: WalrusSaver):
    """Compile a trivial one-node incrementing graph with ``saver``."""

    def step(state: _State) -> _State:
        return {"value": state["value"] + 1, "log": ["step"]}

    g = StateGraph(_State)
    g.add_node("step", step)
    g.add_edge(START, "step")
    g.add_edge("step", END)
    return g.compile(checkpointer=saver)


def test_real_blob_round_trip() -> None:
    """A random payload PUT to a publisher reads back identically."""
    client = WalrusClient()
    payload = b"tuskpoint-integration-" + uuid.uuid4().bytes
    blob_id = client.store(payload)
    assert isinstance(blob_id, str) and blob_id
    assert client.read(blob_id) == payload


def test_saver_persist_and_resume_across_instances(tmp_path) -> None:
    """Checkpoint stored via one saver is retrievable by a fresh saver.

    Only the manifest blob ID is shared on disk; the actual checkpoint state is
    fetched back from Walrus, mirroring a cold process restart.
    """
    cache = str(tmp_path / "threads.json")
    thread_id = f"it-{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}

    saver1 = WalrusSaver(WalrusClient(), threads_cache_path=cache)
    graph1 = _build_graph(saver1)
    graph1.invoke({"value": 41, "log": []}, config)

    # Fresh saver + fresh client; only the on-disk manifest pointer is shared.
    saver2 = WalrusSaver(WalrusClient(), threads_cache_path=cache)
    graph2 = _build_graph(saver2)
    snap = graph2.get_state(config)
    assert snap.values["value"] == 42
