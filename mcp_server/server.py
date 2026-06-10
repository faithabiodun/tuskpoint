"""TuskPoint MCP server — six checkpoint tools over stdio.

This server wraps :class:`~langgraph_checkpoint_walrus.WalrusSaver` so any
MCP-capable agent (Claude Desktop, etc.) can save, load, list, resume, diff, and
semantically search **LangGraph-style checkpoints** stored on Walrus.

It deliberately does NOT duplicate MemWal's own MCP (remember/recall/analyze/
restore/login/logout). Those manage free-form *memories*; these manage durable,
exactly-addressable *checkpoints* — agent state you can rewind to. The one
overlap, ``checkpoint_search``, is scoped to *our* checkpoint summaries.

Transport: stdio (``mcp.run(transport="stdio")``). Configuration is read from the
environment / ``.env`` (Walrus URLs + optional MemWal credentials).

Run directly:
    python mcp_server/server.py

Or register it with an MCP client via the ``.mcp.json`` snippet in the README.
"""

from __future__ import annotations

import os
import json
import time
import uuid
from typing import Any

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from langgraph_checkpoint_walrus import WalrusSaver, WalrusClient
from langgraph_checkpoint_walrus.manifest import ThreadManifest

load_dotenv()

mcp = FastMCP("tuskpoint-checkpoints")

# A single shared saver backed by real Walrus. The MemWal layer is attached only
# if credentials are present, so the server still runs without them (semantic
# search then returns an explanatory message instead of failing).
_THREADS_CACHE = os.getenv("WALRUS_THREADS_CACHE", ".walrus_threads.json")


def _build_saver() -> WalrusSaver:
    """Construct the shared WalrusSaver, attaching MemWal if configured."""
    memwal_layer = None
    if os.getenv("MEMWAL_PRIVATE_KEY") and os.getenv("MEMWAL_ACCOUNT_ID"):
        try:
            from langgraph_checkpoint_walrus import MemWalLayer

            memwal_layer = MemWalLayer.from_env()
        except Exception:  # noqa: BLE001 - degrade gracefully without MemWal
            memwal_layer = None
    return WalrusSaver(
        WalrusClient(), threads_cache_path=_THREADS_CACHE, memwal_layer=memwal_layer
    )


_saver = _build_saver()


# ----------------------------------------------------------------------
# Checkpoint helpers (MCP treats a checkpoint as: a user state dict + lineage)
# ----------------------------------------------------------------------

def _new_checkpoint(state: dict[str, Any]) -> dict[str, Any]:
    """Wrap a plain user-state dict into a minimal LangGraph-style checkpoint."""
    return {
        "v": 1,
        "id": str(uuid.uuid1()),  # time-ordered, like LangGraph's IDs
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "channel_values": {"state": state},
        "channel_versions": {"state": 1},
        "versions_seen": {},
        "pending_sends": [],
    }


def _state_from_tuple(tup: Any) -> Any:
    """Extract the user state dict back out of a checkpoint tuple."""
    if tup is None:
        return None
    return tup.checkpoint.get("channel_values", {}).get("state")


# ----------------------------------------------------------------------
# The six tools
# ----------------------------------------------------------------------

@mcp.tool()
def checkpoint_save(thread_id: str, state_json: str) -> str:
    """Save agent state as a new checkpoint on Walrus and return its blob ID.

    Args:
        thread_id: The conversation/agent thread to append this checkpoint to.
        state_json: The agent state to persist, as a JSON object string.

    Returns:
        A JSON string ``{"checkpoint_id", "blob_id", "thread_id"}``.
    """
    try:
        state = json.loads(state_json)
    except json.JSONDecodeError as exc:
        return json.dumps({"error": f"state_json is not valid JSON: {exc}"})

    manifest = _saver._load_manifest(thread_id)
    parent_id = manifest.latest_id()

    checkpoint = _new_checkpoint(state)
    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": "",
            "checkpoint_id": parent_id,  # parent lineage
        }
    }
    metadata = {"source": "mcp", "step": len(manifest.entries), "writes": None}
    _saver.put(config, checkpoint, metadata, {"state": 1})

    new_manifest = _saver._load_manifest(thread_id)
    entry = new_manifest.get(checkpoint["id"])
    return json.dumps(
        {
            "thread_id": thread_id,
            "checkpoint_id": checkpoint["id"],
            "blob_id": entry.blob_id if entry else None,
        }
    )


@mcp.tool()
def checkpoint_load(thread_id: str, checkpoint_id: str | None = None) -> str:
    """Load a specific checkpoint's state (or the latest) by exact lookup.

    Args:
        thread_id: The thread to read from.
        checkpoint_id: The exact checkpoint to load. If omitted, loads the latest.

    Returns:
        A JSON string with the stored state, or an error object if not found.
    """
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    if checkpoint_id:
        config["configurable"]["checkpoint_id"] = checkpoint_id

    tup = _saver.get_tuple(config)
    if tup is None:
        return json.dumps({"error": "no checkpoint found", "thread_id": thread_id})
    return json.dumps(
        {
            "thread_id": thread_id,
            "checkpoint_id": tup.config["configurable"]["checkpoint_id"],
            "state": _state_from_tuple(tup),
        }
    )


@mcp.tool()
def checkpoint_list(thread_id: str) -> str:
    """List a thread's checkpoints (newest first) with metadata.

    Args:
        thread_id: The thread whose history to list.

    Returns:
        A JSON array of ``{checkpoint_id, blob_id, parent, timestamp, summary}``.
    """
    manifest: ThreadManifest = _saver._load_manifest(thread_id)
    out = []
    for cid in manifest.ordered_ids(newest_first=True):
        e = manifest.get(cid)
        out.append(
            {
                "checkpoint_id": cid,
                "blob_id": e.blob_id,
                "parent_checkpoint_id": e.parent_checkpoint_id,
                "timestamp": e.timestamp,
                "summary": e.summary,
            }
        )
    return json.dumps({"thread_id": thread_id, "count": len(out), "checkpoints": out})


@mcp.tool()
def checkpoint_resume(thread_id: str) -> str:
    """Return the latest full state for a thread, for resuming work.

    Args:
        thread_id: The thread to resume.

    Returns:
        A JSON string with the latest checkpoint ID and its state.
    """
    return checkpoint_load(thread_id, None)


@mcp.tool()
def checkpoint_diff(thread_id: str, id_a: str, id_b: str) -> str:
    """Produce a human-readable diff between two checkpoints' states.

    Args:
        thread_id: The thread both checkpoints belong to.
        id_a: The earlier (baseline) checkpoint ID.
        id_b: The later (comparison) checkpoint ID.

    Returns:
        A JSON string describing added/removed/changed top-level state keys.
    """
    def _load(cid: str) -> Any:
        tup = _saver.get_tuple(
            {"configurable": {"thread_id": thread_id, "checkpoint_id": cid}}
        )
        return _state_from_tuple(tup)

    a = _load(id_a)
    b = _load(id_b)
    if a is None or b is None:
        return json.dumps({"error": "one or both checkpoints not found"})

    a_dict = a if isinstance(a, dict) else {"value": a}
    b_dict = b if isinstance(b, dict) else {"value": b}
    keys = sorted(set(a_dict) | set(b_dict))

    added, removed, changed, lines = {}, {}, {}, []
    for k in keys:
        if k not in a_dict:
            added[k] = b_dict[k]
            lines.append(f"+ {k}: {b_dict[k]!r}")
        elif k not in b_dict:
            removed[k] = a_dict[k]
            lines.append(f"- {k}: {a_dict[k]!r}")
        elif a_dict[k] != b_dict[k]:
            changed[k] = {"from": a_dict[k], "to": b_dict[k]}
            lines.append(f"~ {k}: {a_dict[k]!r} -> {b_dict[k]!r}")

    return json.dumps(
        {
            "thread_id": thread_id,
            "id_a": id_a,
            "id_b": id_b,
            "added": added,
            "removed": removed,
            "changed": changed,
            "human_readable": "\n".join(lines) or "(no differences)",
        }
    )


@mcp.tool()
def checkpoint_search(query: str) -> str:
    """Semantically search past checkpoint summaries via MemWal recall.

    Args:
        query: A natural-language question about past agent state, e.g.
            "when did the writer start?".

    Returns:
        A JSON array of ``{text, distance}`` hits, or a message if MemWal is not
        configured.
    """
    if _saver.memwal_layer is None:
        return json.dumps(
            {
                "error": "semantic search unavailable: no MemWal credentials "
                "configured (set MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID).",
                "results": [],
            }
        )
    hits = _saver.search_history(query, limit=5)
    return json.dumps({"query": query, "results": hits})


if __name__ == "__main__":
    mcp.run(transport="stdio")
