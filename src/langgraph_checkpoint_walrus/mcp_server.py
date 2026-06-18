"""TuskPoint MCP server — the all-in-one checkpoint toolbelt over stdio.

This server wraps :class:`~langgraph_checkpoint_walrus.WalrusSaver` so any
MCP-capable agent (Claude Desktop, Claude Code, Cursor, Windsurf, …) can save,
load, list, resume, diff, semantically search, **fork**, and **audit**
LangGraph-style checkpoints stored on Walrus — plus a ``tuskpoint_info`` tool
that returns ready-to-paste client setup so an agent can wire itself up.

It deliberately does NOT duplicate MemWal's own MCP (remember/recall/analyze/
restore/login/logout). Those manage free-form *memories*; these manage durable,
exactly-addressable *checkpoints* — agent state you can rewind to. The one
overlap, ``checkpoint_search``, is scoped to *our* checkpoint summaries.

Transport: stdio (``mcp.run(transport="stdio")``). Configuration is read from the
environment / ``.env`` (Walrus URLs + MemWal credentials, which power the
plain-English ``checkpoint_search`` recall).

Run it as a plugin (no clone needed):
    uvx tuskpoint-mcp

Or, from a source checkout, ``python mcp_server/server.py`` still works (thin shim),
or register it with an MCP client via the ``.mcp.json`` snippet in the README.
"""

from __future__ import annotations

import os
import sys
import json
import time
from typing import Any

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from langgraph.checkpoint.base.id import uuid6

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
        except Exception as exc:  # noqa: BLE001 - degrade gracefully without MemWal
            # Credentials are present but the layer failed to initialize. Surface
            # the reason on stderr instead of silently pretending it's missing,
            # then keep running so the exact (Walrus) layer still works.
            print(
                f"[tuskpoint] MemWal credentials set but init failed: {exc!r}. "
                "Semantic search (checkpoint_search) is disabled.",
                file=sys.stderr,
            )
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
        "id": str(uuid6()),  # lexically time-ordered, exactly like LangGraph's IDs
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "channel_values": {"state": state},
        "channel_versions": {"state": 1},
        "versions_seen": {},
        "pending_sends": [],
    }


def _state_from_tuple(tup: Any) -> Any:
    """Extract the human-meaningful state from a checkpoint tuple.

    Two checkpoint shapes flow through the tools:

    * Saves made via :func:`_new_checkpoint` wrap the payload under a single
      ``state`` channel, so we unwrap that.
    * Real LangGraph runs store each graph channel directly (``topic``,
      ``report``, plus internal channels like ``__start__`` and
      ``branch:to:<node>``). We return the visible channels as-is, minus the
      internal bookkeeping ones, so loading a real run returns its actual state
      instead of ``None``.
    """
    if tup is None:
        return None
    cv = tup.checkpoint.get("channel_values", {}) or {}
    if "state" in cv and len(cv) == 1:
        return cv["state"]
    visible = {
        k: v
        for k, v in cv.items()
        if not k.startswith("__") and not k.startswith("branch:")
    }
    return visible if visible else None


# ----------------------------------------------------------------------
# The checkpoint tools
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

    try:
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
    except Exception as exc:  # noqa: BLE001 - surface Walrus/transport faults as data
        return json.dumps({"error": f"checkpoint_save failed: {exc}"})
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

    try:
        tup = _saver.get_tuple(config)
    except Exception as exc:  # noqa: BLE001 - surface Walrus/transport faults as data
        return json.dumps({"error": f"checkpoint_load failed: {exc}"})
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
    try:
        manifest: ThreadManifest = _saver._load_manifest(thread_id)
    except Exception as exc:  # noqa: BLE001 - surface Walrus/transport faults as data
        return json.dumps({"error": f"checkpoint_list failed: {exc}"})
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

    try:
        a = _load(id_a)
        b = _load(id_b)
    except Exception as exc:  # noqa: BLE001 - surface Walrus/transport faults as data
        return json.dumps({"error": f"checkpoint_diff failed: {exc}"})
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
    try:
        hits = _saver.search_history(query, limit=5)
    except Exception as exc:  # noqa: BLE001 - surface MemWal/transport faults as data
        return json.dumps({"error": f"checkpoint_search failed: {exc}", "results": []})
    return json.dumps({"query": query, "results": hits})


# ----------------------------------------------------------------------
# Fork & replay — "git branch" for agent runs
# ----------------------------------------------------------------------

@mcp.tool()
def checkpoint_fork(
    source_thread_id: str,
    source_checkpoint_id: str,
    new_thread_id: str,
) -> str:
    """Fork an existing checkpoint into a brand-new thread to explore a different path.

    This is the "git branch" for agent runs: it copies the exact state at
    ``source_checkpoint_id`` into ``new_thread_id`` as that thread's genesis
    checkpoint, recording the ``forked_from`` lineage. The original thread is
    left untouched, so you can replay from a known-good point and try an
    alternative without losing history.

    Args:
        source_thread_id: The thread to branch from.
        source_checkpoint_id: The exact checkpoint in that thread to copy.
        new_thread_id: The new thread to create (must not already have history).

    Returns:
        A JSON string
        ``{"source", "new_thread_id", "checkpoint_id", "blob_id", "forked_from"}``.
    """
    try:
        result = _saver.fork(
            source_thread_id=source_thread_id,
            source_checkpoint_id=source_checkpoint_id,
            new_thread_id=new_thread_id,
        )
    except KeyError as exc:
        return json.dumps({"error": f"source checkpoint not found: {exc}"})
    except ValueError as exc:
        return json.dumps({"error": str(exc)})
    return json.dumps(result)


@mcp.tool()
def checkpoint_rollback(thread_id: str, checkpoint_id: str) -> str:
    """Roll a thread back to an earlier checkpoint (durable, auditable undo).

    Restores the exact state at ``checkpoint_id`` as a brand-new checkpoint at
    the head of the SAME thread. Unlike a fork, this stays on the thread so the
    next ``checkpoint_resume`` continues from the restored state. It is
    append-only: the intervening (e.g. bad) checkpoints are never deleted, so
    the rollback is itself a visible, verifiable step and history stays intact.

    Args:
        thread_id: The thread to roll back.
        checkpoint_id: The earlier checkpoint whose state to restore.

    Returns:
        A JSON string ``{"thread_id", "checkpoint_id" (the new head),
        "restored_from", "blob_id", "rolled_back_from"}``.
    """
    try:
        result = _saver.rollback_to(
            thread_id=thread_id, checkpoint_id=checkpoint_id
        )
    except KeyError as exc:
        return json.dumps({"error": f"checkpoint not found: {exc}"})
    return json.dumps(result)


# ----------------------------------------------------------------------
# Cross-agent handoff — pass a checkpoint between agents/processes
# ----------------------------------------------------------------------

@mcp.tool()
def handoff_checkpoint(
    thread_id: str, checkpoint_id: str, to_agent: str = ""
) -> str:
    """Export a checkpoint so a DIFFERENT agent can pick up exactly where you left off.

    Emits a small portable descriptor (the Walrus blob ID + its SHA-256 +
    provenance) — not a copy of the state. Hand the returned JSON to another
    agent/process, which calls ``adopt_checkpoint`` to re-fetch the same blob
    from Walrus and verify the hash. The state crosses the boundary
    tamper-evidently with nothing trusted in between; no keys or Sui gating.

    Args:
        thread_id: The thread holding the checkpoint to hand off.
        checkpoint_id: The exact checkpoint to hand off.
        to_agent: Optional label for the intended recipient (audit only; does
            not restrict who can adopt).

    Returns:
        A JSON descriptor ``{"source", "thread_id", "checkpoint_id", "blob_id",
        "blob_sha256", "to_agent", "summary"}`` to pass to ``adopt_checkpoint``.
    """
    try:
        result = _saver.handoff_checkpoint(
            thread_id, checkpoint_id, to_agent=to_agent or None
        )
    except KeyError as exc:
        return json.dumps({"error": f"checkpoint not found: {exc}"})
    return json.dumps(result)


@mcp.tool()
def adopt_checkpoint(handoff_json: str, new_thread_id: str) -> str:
    """Adopt a handed-off checkpoint as the start of your own new thread.

    Takes the JSON descriptor from ``handoff_checkpoint``, re-fetches the blob
    from Walrus, verifies its SHA-256 against the sender's hash (rejecting any
    tampered blob), and writes it as the genesis of ``new_thread_id`` with an
    ``adopted_from`` lineage link. You then resume from this state as your own.

    Args:
        handoff_json: The JSON descriptor returned by ``handoff_checkpoint``.
        new_thread_id: A fresh thread ID to adopt into (must be empty).

    Returns:
        A JSON string ``{"adopted_from", "new_thread_id", "checkpoint_id",
        "blob_id", "verified"}``.
    """
    try:
        handoff = json.loads(handoff_json)
    except json.JSONDecodeError as exc:
        return json.dumps({"error": f"invalid handoff JSON: {exc}"})
    try:
        result = _saver.adopt_checkpoint(handoff, new_thread_id)
    except KeyError as exc:
        return json.dumps({"error": f"handoff blob not found: {exc}"})
    except ValueError as exc:
        return json.dumps({"error": str(exc)})
    return json.dumps(result)


@mcp.tool()
def verify_trail(thread_id: str) -> str:
    """Cryptographically verify a thread's checkpoint chain (tamper-evident).

    Walks every checkpoint in order, re-fetches its Walrus blob, recomputes the
    blob's SHA-256, and compares it to the hash recorded in the manifest at write
    time. Any silent corruption or tampering changes the recomputed hash and the
    step is reported as ``FAIL``. Checkpoints written before integrity hashing
    have no stored hash and are reported honestly as ``UNVERIFIED`` (never a pass).

    Args:
        thread_id: The thread whose blob chain should be verified.

    Returns:
        A JSON string ``{"thread_id", "ok", "checkpoint_count", "verified",
        "tampered_count", "steps"}`` where each step is ``{"checkpoint_id",
        "blob_id", "stored_hash", "recomputed_hash", "status"}`` and ``status``
        is ``PASS`` | ``FAIL`` | ``UNVERIFIED``. ``ok`` is true only when at
        least one checkpoint PASSed and none FAILed.
    """
    return json.dumps(_saver.verify_trail(thread_id))


# ----------------------------------------------------------------------
# Self-describing setup — let an agent wire itself into any MCP client
# ----------------------------------------------------------------------

@mcp.tool()
def tuskpoint_info() -> str:
    """Describe this server and return ready-to-paste client setup.

    Returns the full tool list plus copy-paste MCP configuration for every common
    client (Claude Desktop, Claude Code, Cursor, Windsurf, Gemini CLI,
    VS Code / Copilot, OpenAI Codex CLI, and the generic ``.mcp.json`` form), so
    an agent or user can connect TuskPoint without leaving the chat.

    Returns:
        A JSON string ``{"name", "transport", "tools", "connect", "notes"}``.
    """
    server_cmd = {
        "command": "uvx",
        "args": ["tuskpoint-mcp"],
    }
    tools = [
        {"name": "checkpoint_save", "summary": "Persist agent state as a new Walrus blob."},
        {"name": "checkpoint_load", "summary": "Load a specific (or latest) checkpoint by id."},
        {"name": "checkpoint_list", "summary": "List a thread's checkpoints, newest first."},
        {"name": "checkpoint_resume", "summary": "Return the latest state to continue a thread."},
        {"name": "checkpoint_diff", "summary": "Human-readable diff between two checkpoints."},
        {"name": "checkpoint_search", "summary": "Semantic recall over checkpoint summaries (MemWal)."},
        {"name": "checkpoint_fork", "summary": "Branch a checkpoint into a new thread to replay a different path."},
        {"name": "checkpoint_rollback", "summary": "Restore an earlier checkpoint as the new head of the same thread (auditable undo)."},
        {"name": "handoff_checkpoint", "summary": "Export a checkpoint descriptor for another agent to adopt."},
        {"name": "adopt_checkpoint", "summary": "Adopt a handed-off checkpoint (hash-verified) as a new thread's start."},
        {"name": "verify_trail", "summary": "Audit a thread's blob chain for tamper-evident integrity."},
        {"name": "tuskpoint_info", "summary": "This tool: describe the server and emit client setup."},
    ]
    connect = {
        "claude_desktop": {
            "file": "claude_desktop_config.json",
            "config": {"mcpServers": {"tuskpoint": server_cmd}},
        },
        "claude_code": {
            "command": "claude mcp add tuskpoint -- uvx tuskpoint-mcp",
        },
        "cursor": {
            "file": ".cursor/mcp.json",
            "config": {"mcpServers": {"tuskpoint": server_cmd}},
        },
        "windsurf": {
            "file": "~/.codeium/windsurf/mcp_config.json",
            "config": {"mcpServers": {"tuskpoint": server_cmd}},
        },
        "gemini_cli": {
            # Google Gemini CLI reads ~/.gemini/settings.json (or project
            # .gemini/settings.json) and uses the same "mcpServers" shape.
            "file": "~/.gemini/settings.json",
            "config": {"mcpServers": {"tuskpoint": server_cmd}},
        },
        "vscode": {
            # VS Code (GitHub Copilot agent mode) uses a "servers" key.
            "file": ".vscode/mcp.json",
            "config": {"servers": {"tuskpoint": {**server_cmd, "type": "stdio"}}},
        },
        "codex_cli": {
            # OpenAI Codex CLI uses TOML, not JSON.
            "file": "~/.codex/config.toml",
            "config_toml": (
                "[mcp_servers.tuskpoint]\n"
                'command = "uvx"\n'
                'args = ["tuskpoint-mcp"]\n'
            ),
        },
        "generic": {
            "file": ".mcp.json",
            "config": {"mcpServers": {"tuskpoint": server_cmd}},
        },
    }
    notes = [
        "Transport is stdio; 'uvx tuskpoint-mcp' fetches and runs the server, no clone needed.",
        "Defaults to Walrus testnet (free writes); set WALRUS_*_URL to mainnet for paid durable storage (see .env.example).",
        "Set MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID to enable checkpoint_search.",
        "This same setup is served as plain text at 'curl -sL https://tuskpoint.xyz/skills/setup'.",
    ]
    return json.dumps(
        {
            "name": "tuskpoint-checkpoints",
            "transport": "stdio",
            "tools": tools,
            "connect": connect,
            "notes": notes,
        }
    )


def main() -> None:
    """Console entry point: run the TuskPoint MCP server over stdio.

    Exposed as the ``tuskpoint-mcp`` script (see ``pyproject.toml`` ``[project.scripts]``)
    so MCP clients can launch it with ``uvx tuskpoint-mcp`` — no clone, no cwd.
    """
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
