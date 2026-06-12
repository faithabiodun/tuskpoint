"""TuskPoint HTTP API — the real engine behind tuskpoint.vercel.app.

This is a thin FastAPI wrapper around :class:`WalrusSaver` so the web dashboard
can call the genuine checkpoint engine over HTTP instead of shipping a static
snapshot. It exposes the same operations the MCP server does (see
``mcp_server/server.py``), reusing the identical logic so the two stay in lockstep.

Secrets (MemWal keys, Walrus publisher) live only in this service's environment —
never in the browser. The Next.js app proxies to this service through its own
server-side routes, passing ``x-tuskpoint-token``.

Run locally:
    uvicorn api_service.app:app --reload

Deploy: see ``api_service/README.md`` (Render free tier by default; Dockerfile
provided for Hugging Face Spaces / Koyeb).
"""

from __future__ import annotations

import os
import time
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langgraph_checkpoint_walrus import WalrusSaver, WalrusClient
from langgraph_checkpoint_walrus.manifest import ThreadManifest

load_dotenv()

# ----------------------------------------------------------------------
# Shared saver — constructed exactly like mcp_server/server.py:47-62.
# MemWal is attached only if credentials are present, so the service still
# runs (with search disabled) without them.
# ----------------------------------------------------------------------
_THREADS_CACHE = os.getenv("WALRUS_THREADS_CACHE", ".walrus_threads.json")
_API_TOKEN = os.getenv("TUSKPOINT_API_TOKEN", "")
_DEMO_THREAD = os.getenv("TUSKPOINT_DEMO_THREAD", "run-43312")
_ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")


def _build_saver() -> WalrusSaver:
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


def _network() -> str:
    """Best-effort label for which Walrus network this service writes to."""
    pub = os.getenv("WALRUS_PUBLISHER_URL", "")
    if "testnet" in pub:
        return "testnet"
    if "mainnet" in pub or not pub:
        return "mainnet"
    return "custom"


# ----------------------------------------------------------------------
# Checkpoint helpers (identical to mcp_server/server.py:69-86)
# ----------------------------------------------------------------------

def _new_checkpoint(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "v": 1,
        "id": str(uuid.uuid1()),
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        "channel_values": {"state": state},
        "channel_versions": {"state": 1},
        "versions_seen": {},
        "pending_sends": [],
    }


def _state_from_tuple(tup: Any) -> Any:
    """Extract the human-meaningful state from a checkpoint tuple.

    Two checkpoint shapes flow through this service:

    * Web/MCP saves wrap the payload under a single ``state`` channel
      (see :func:`_new_checkpoint`), so we unwrap that.
    * Real LangGraph runs (e.g. the exported ``run-43312`` showcase thread)
      store each graph channel directly — ``topic``, ``sources``, ``report``,
      plus internal bookkeeping channels like ``__start__`` and
      ``branch:to:<node>``. We return those channels as-is, minus the internal
      ones, so the dashboard shows the real agent state.
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
# FastAPI app
# ----------------------------------------------------------------------

app = FastAPI(
    title="TuskPoint API",
    description="The real Walrus-backed checkpoint engine behind tuskpoint.vercel.app.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_ALLOWED_ORIGIN] if _ALLOWED_ORIGIN != "*" else ["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _require_token(token: str | None) -> None:
    """Gate mutating routes. If no token is configured, the gate is open."""
    if not _API_TOKEN:
        return
    if token != _API_TOKEN:
        raise HTTPException(status_code=401, detail="invalid or missing token")


class DiffBody(BaseModel):
    id_a: str
    id_b: str


class SearchBody(BaseModel):
    query: str


class SaveBody(BaseModel):
    state: dict[str, Any]


class ForkBody(BaseModel):
    source_thread_id: str
    source_checkpoint_id: str
    new_thread_id: str


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "backend": "walrus",
        "memwal": _saver.memwal_layer is not None,
        "network": _network(),
        "seed_thread": _DEMO_THREAD,
    }


@app.get("/seed-thread")
def seed_thread() -> dict[str, str]:
    return {"thread_id": _DEMO_THREAD}


@app.get("/thread/{thread_id}")
def list_thread(thread_id: str) -> dict[str, Any]:
    """List a thread's checkpoints, newest first (mirrors checkpoint_list)."""
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
                "forked_from": e.forked_from,
            }
        )
    return {"thread_id": thread_id, "count": len(out), "checkpoints": out}


@app.get("/thread/{thread_id}/checkpoint/{checkpoint_id}")
def load_checkpoint(thread_id: str, checkpoint_id: str) -> dict[str, Any]:
    """Load one checkpoint's state by exact lookup (mirrors checkpoint_load)."""
    config: dict[str, Any] = {
        "configurable": {"thread_id": thread_id, "checkpoint_id": checkpoint_id}
    }
    tup = _saver.get_tuple(config)
    if tup is None:
        raise HTTPException(status_code=404, detail="no checkpoint found")
    return {
        "thread_id": thread_id,
        "checkpoint_id": tup.config["configurable"]["checkpoint_id"],
        "state": _state_from_tuple(tup),
    }


@app.get("/thread/{thread_id}/resume")
def resume(thread_id: str) -> dict[str, Any]:
    """Return the latest state for a thread (mirrors checkpoint_resume)."""
    tup = _saver.get_tuple({"configurable": {"thread_id": thread_id}})
    if tup is None:
        raise HTTPException(status_code=404, detail="no checkpoint found")
    return {
        "thread_id": thread_id,
        "checkpoint_id": tup.config["configurable"]["checkpoint_id"],
        "state": _state_from_tuple(tup),
    }


@app.post("/thread/{thread_id}/diff")
def diff(thread_id: str, body: DiffBody) -> dict[str, Any]:
    """Human-readable diff between two checkpoints (mirrors checkpoint_diff)."""

    def _load(cid: str) -> Any:
        tup = _saver.get_tuple(
            {"configurable": {"thread_id": thread_id, "checkpoint_id": cid}}
        )
        return _state_from_tuple(tup)

    a = _load(body.id_a)
    b = _load(body.id_b)
    if a is None or b is None:
        raise HTTPException(status_code=404, detail="one or both checkpoints not found")

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

    return {
        "thread_id": thread_id,
        "id_a": body.id_a,
        "id_b": body.id_b,
        "added": added,
        "removed": removed,
        "changed": changed,
        "human_readable": "\n".join(lines) or "(no differences)",
    }


@app.post("/search")
def search(body: SearchBody) -> dict[str, Any]:
    """Semantic recall over checkpoint summaries (mirrors checkpoint_search)."""
    if _saver.memwal_layer is None:
        raise HTTPException(
            status_code=503,
            detail="semantic search unavailable: no MemWal credentials configured",
        )
    hits = _saver.search_history(body.query, limit=5)
    return {"query": body.query, "results": hits}


@app.post("/thread/{thread_id}/save")
def save(
    thread_id: str,
    body: SaveBody,
    x_tuskpoint_token: str | None = Header(default=None),
) -> dict[str, Any]:
    """Persist agent state as a new Walrus blob (mirrors checkpoint_save)."""
    _require_token(x_tuskpoint_token)

    manifest = _saver._load_manifest(thread_id)
    parent_id = manifest.latest_id()

    checkpoint = _new_checkpoint(body.state)
    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": "",
            "checkpoint_id": parent_id,
        }
    }
    metadata = {"source": "web", "step": len(manifest.entries), "writes": None}
    _saver.put(config, checkpoint, metadata, {"state": 1})

    new_manifest = _saver._load_manifest(thread_id)
    entry = new_manifest.get(checkpoint["id"])
    return {
        "thread_id": thread_id,
        "checkpoint_id": checkpoint["id"],
        "blob_id": entry.blob_id if entry else None,
    }


@app.post("/fork")
def fork(
    body: ForkBody,
    x_tuskpoint_token: str | None = Header(default=None),
) -> dict[str, Any]:
    """Branch a checkpoint into a new thread (mirrors checkpoint_fork)."""
    _require_token(x_tuskpoint_token)
    try:
        return _saver.fork(
            source_thread_id=body.source_thread_id,
            source_checkpoint_id=body.source_checkpoint_id,
            new_thread_id=body.new_thread_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"source checkpoint not found: {exc}")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.get("/thread/{thread_id}/verify")
def verify(thread_id: str) -> dict[str, Any]:
    """Audit a thread's blob chain end-to-end (mirrors verify_trail)."""
    return _saver.verify_trail(thread_id)
