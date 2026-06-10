"""Run the real agent against live Walrus + MemWal and export a snapshot JSON.

This produces ``web/src/lib/snapshot.json`` — a genuine record of one
researcher -> writer run: real Walrus blob IDs, the real per-checkpoint state,
the manifest blob ID, the MemWal summaries, and a real semantic-search result.

The web app renders this exported snapshot statically (no keys ship to Vercel).

Usage:
    python scripts/export_snapshot.py
"""

from __future__ import annotations

import os
import sys
import json
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
sys.path.insert(0, os.path.join(ROOT, "demo"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(ROOT, ".env"))

from agent import build_agent  # noqa: E402
from langgraph_checkpoint_walrus import (  # noqa: E402
    WalrusSaver,
    WalrusClient,
    MemWalLayer,
)

OUT = os.path.join(ROOT, "web", "src", "lib", "snapshot.json")
THREADS_CACHE = os.path.join(ROOT, ".walrus_threads.json")
TOPIC = "decentralized storage on Walrus"
QUERY = "when did the writer start?"


def _node_for_step(step: int) -> str:
    if step < 0:
        return "__input__"
    if step <= 1:
        return "researcher"
    return "writer"


def main() -> int:
    print("[export] Building MemWal layer + real Walrus client...")
    layer = MemWalLayer.from_env()
    client = WalrusClient()
    saver = WalrusSaver(
        client, threads_cache_path=THREADS_CACHE, memwal_layer=layer
    )
    agent = build_agent(saver)  # run to completion, no interrupt

    thread_id = f"run-{os.getpid()}"
    config = {"configurable": {"thread_id": thread_id}}
    print(f"[export] Running agent (thread={thread_id}) on topic: {TOPIC!r}")
    final = agent.invoke({"topic": TOPIC}, config)
    print(f"[export] Done. Report length: {len(final.get('report',''))} chars.")

    # Pull the real manifest for this thread straight from the saver.
    manifest = saver._load_manifest(thread_id)
    manifest_blob_id = saver._manifest_ids.get(thread_id, "")

    checkpoints = []
    ordered = manifest.ordered_ids(newest_first=False)
    for idx, cid in enumerate(ordered):
        entry = manifest.get(cid)
        tup = saver.get_tuple(
            {"configurable": {"thread_id": thread_id, "checkpoint_id": cid}}
        )
        cp = tup.checkpoint if tup else {}
        step = cp.get("metadata", {}).get("step")
        if step is None and tup is not None:
            step = (tup.metadata or {}).get("step", idx - 1)
        channel_values = cp.get("channel_values", {}) if tup else {}
        # Keep only JSON-serialisable, human-meaningful channels.
        state = {
            k: v
            for k, v in channel_values.items()
            if k in ("topic", "sources", "report")
        }
        short = f"{cid[:8]}\u2026{cid[-4:]}"
        checkpoints.append(
            {
                "id": cid,
                "shortId": short,
                "step": step if step is not None else idx - 1,
                "node": _node_for_step(step if step is not None else idx - 1),
                "blobId": entry.blob_id,
                "parent": entry.parent_checkpoint_id,
                "timestamp": entry.timestamp,
                "summary": entry.summary,
                "state": state,
            }
        )

    print(f"[export] Captured {len(checkpoints)} real checkpoints.")

    print(f"[export] Semantic search: {QUERY!r}")
    hits = saver.search_history(QUERY, limit=5)
    search = [{"text": h["text"], "distance": round(h["distance"], 4)} for h in hits]
    print(f"[export] Got {len(search)} real search hits.")

    snapshot = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "topic": TOPIC,
        "query": QUERY,
        "thread": {
            "id": thread_id,
            "title": "Researcher \u2192 Writer",
            "topic": TOPIC,
            "manifestBlobId": manifest_blob_id,
            "checkpoints": checkpoints,
        },
        "search": search,
        "report": final.get("report", ""),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, indent=2, ensure_ascii=False)
    print(f"[export] Wrote real snapshot -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
