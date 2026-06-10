"""Unit tests for the MemWal semantic layer's pure summary builder.

The networked parts (remember/recall) are covered by the standalone
``scripts/check_memwal.py`` proof and the live demo; here we test the
deterministic ``build_summary`` logic with no network or credentials.
"""

from __future__ import annotations

from langgraph_checkpoint_walrus.memwal_layer import MemWalLayer


def test_summary_for_node_write() -> None:
    summary = MemWalLayer.build_summary(
        thread_id="t1",
        checkpoint_id="cp-9",
        checkpoint={},
        metadata={"source": "loop", "step": 2, "writes": {"writer": {"report": "x"}}},
    )
    assert "thread=t1" in summary
    assert "checkpoint=cp-9" in summary
    assert "writer" in summary
    assert "report" in summary


def test_summary_for_initial_input() -> None:
    summary = MemWalLayer.build_summary(
        thread_id="t1",
        checkpoint_id="cp-0",
        checkpoint={},
        metadata={"source": "input", "step": -1, "writes": None},
    )
    assert "initial input" in summary
    assert "step=-1" in summary


def test_summary_handles_missing_metadata() -> None:
    summary = MemWalLayer.build_summary(
        thread_id="t1", checkpoint_id="cp-1", checkpoint={}, metadata={}
    )
    # Should not raise and should still embed the identifiers.
    assert "thread=t1" in summary and "checkpoint=cp-1" in summary
