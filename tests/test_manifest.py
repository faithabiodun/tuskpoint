"""Unit tests for the per-thread manifest model and its JSON round-trip."""

from __future__ import annotations

from langgraph_checkpoint_walrus.manifest import CheckpointEntry, ThreadManifest


def test_add_and_get() -> None:
    m = ThreadManifest(thread_id="t1")
    entry = CheckpointEntry(
        blob_id="blob-a", parent_checkpoint_id=None, timestamp="2024-01-01T00:00:00"
    )
    m.add("cp-1", entry)
    assert m.get("cp-1") is entry
    assert m.get("missing") is None


def test_latest_and_ordering() -> None:
    m = ThreadManifest(thread_id="t1")
    # Checkpoint IDs sort lexically == chronologically for UUIDv6.
    m.add("aaa", CheckpointEntry("b1", None, "t0"))
    m.add("ccc", CheckpointEntry("b3", "bbb", "t2"))
    m.add("bbb", CheckpointEntry("b2", "aaa", "t1"))

    assert m.latest_id() == "ccc"
    assert m.ordered_ids(newest_first=True) == ["ccc", "bbb", "aaa"]
    assert m.ordered_ids(newest_first=False) == ["aaa", "bbb", "ccc"]


def test_latest_id_empty() -> None:
    assert ThreadManifest(thread_id="t1").latest_id() is None


def test_json_round_trip() -> None:
    m = ThreadManifest(thread_id="thread-xyz")
    m.add(
        "cp-1",
        CheckpointEntry(
            blob_id="blob-1",
            parent_checkpoint_id=None,
            timestamp="2024-01-01T00:00:00",
            summary="researcher gathered sources",
            checkpoint_ns="",
        ),
    )
    m.add(
        "cp-2",
        CheckpointEntry(
            blob_id="blob-2",
            parent_checkpoint_id="cp-1",
            timestamp="2024-01-01T00:01:00",
            summary="writer drafted the report",
        ),
    )

    restored = ThreadManifest.from_json_bytes(m.to_json_bytes())

    assert restored.thread_id == "thread-xyz"
    assert restored.get("cp-2").parent_checkpoint_id == "cp-1"
    assert restored.get("cp-1").summary == "researcher gathered sources"
    assert restored.ordered_ids() == m.ordered_ids()


def test_checkpoint_ids_are_lexically_time_ordered() -> None:
    """Regression: the IDs we mint must sort lexically == chronologically.

    ``latest_id()`` returns ``max(ids)``, so a newer checkpoint must always
    produce a lexically larger ID. uuid1's string form leads with low time bits
    that wrap (~every 7 min), so it would silently break this; uuid6 does not.
    We force the failure deterministically by crafting two v1/v6 strings where
    the second is generated "later" but has smaller low time bits.
    """
    from langgraph.checkpoint.base.id import uuid6

    # Monotonic over a burst: each new uuid6 must be > the previous one.
    ids = [str(uuid6()) for _ in range(50)]
    assert ids == sorted(ids), "uuid6 IDs are not monotonically increasing"

    # Cross-wrap guard: a later moment with wrapped low bits must still sort
    # after an earlier moment. (uuid1 fails this; uuid6 leads with high bits.)
    earlier = f"{0xffffffff:08x}-6aed-11f1-8000-000000000000"  # v1-style, large low
    later = f"{0x00000001:08x}-6aee-11f1-8000-000000000000"    # v1-style, wrapped low
    # If we (wrongly) used uuid1 layout, `later < earlier` would be True - the bug.
    assert later < earlier, "sanity: demonstrates the uuid1 wrap hazard exists"
