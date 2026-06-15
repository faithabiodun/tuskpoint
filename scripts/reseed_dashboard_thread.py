"""Re-capture the dashboard's seed thread with SHA-256-hashed blobs.

The dashboard defaults to thread ``run-43312`` (api_service/seed_threads.json).
That thread was captured before per-checkpoint integrity hashing existed, so
every checkpoint has ``blob_sha256 = None`` and ``verify_trail`` reports all
steps UNVERIFIED (ok=false).

This re-runs the real agent on live testnet under the SAME public thread id
(``run-43312``) but from an *isolated, empty* cache, so it captures a clean
4-checkpoint chain (no leftover legacy entries) where every blob carries a
stored hash and the per-checkpoint summaries read ``run-43312`` consistently.
It then rewrites seed_threads.json with the fresh manifest blob id and proves
verify is a clean 4/4 PASS through the production seed-key path.

Usage:
    python scripts/reseed_dashboard_thread.py
"""

from __future__ import annotations

import os
import sys
import json
import tempfile

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

SEED_FILE = os.path.join(ROOT, "api_service", "seed_threads.json")
# Public thread id the dashboard shows by default. We capture UNDER this id so
# the timeline summaries read consistently, but from an isolated empty cache so
# we don't append to the legacy un-hashed run-43312 chain.
THREAD_ID = os.getenv("TUSKPOINT_DEMO_THREAD", "run-43312")
TOPIC = "decentralized storage on Walrus"


def _verify(blob_id: str, label: str) -> dict:
    """Verify the thread via a fresh, isolated saver seeded only with this blob."""
    probe = os.path.join(tempfile.gettempdir(), f".tuskpoint_probe_{os.getpid()}.json")
    saver = WalrusSaver(WalrusClient(), threads_cache_path=probe)
    saver._manifest_ids[THREAD_ID] = blob_id  # noqa: SLF001
    res = saver.verify_trail(THREAD_ID)
    print(
        f"[reseed] {label}: ok={res['ok']} "
        f"{res['verified']}/{res['checkpoint_count']} PASS, "
        f"tampered={res['tampered_count']}"
    )
    try:
        os.remove(probe)
    except OSError:
        pass
    return res


def main() -> int:
    print("[reseed] Building MemWal layer + real Walrus client (testnet)...")
    layer = MemWalLayer.from_env()
    client = WalrusClient()

    # Isolated, empty cache: the agent starts run-43312 from a clean slate
    # instead of continuing the legacy chain, so the captured chain is exactly
    # the four checkpoints of this run, all hashed.
    iso_cache = os.path.join(tempfile.gettempdir(), f".tuskpoint_capture_{os.getpid()}.json")
    saver = WalrusSaver(client, threads_cache_path=iso_cache, memwal_layer=layer)

    agent = build_agent(saver)
    config = {"configurable": {"thread_id": THREAD_ID}}
    print(f"[reseed] Running agent (thread={THREAD_ID}, clean slate) on topic: {TOPIC!r}")
    final = agent.invoke({"topic": TOPIC}, config)
    print(f"[reseed] Done. Report length: {len(final.get('report',''))} chars.")

    manifest_blob_id = saver._manifest_ids.get(THREAD_ID, "")
    print(f"[reseed] New manifest blob id: {manifest_blob_id}")

    # Prove the freshly-written chain verifies before publishing the pointer.
    result = saver.verify_trail(THREAD_ID)
    for step in result["steps"]:
        print(f"    {step['status']:<10} {step['checkpoint_id'][:18]} "
              f"blob={step['blob_id'][:16]} hash={'set' if step['stored_hash'] else 'None'}")
    if not (result["ok"] and result["tampered_count"] == 0
            and result["verified"] == result["checkpoint_count"]):
        print("[reseed] ABORT: fresh chain is not a clean full PASS; seed unchanged.")
        return 1

    # Update the committed seed pointer.
    seed = {}
    if os.path.exists(SEED_FILE):
        with open(SEED_FILE, "r", encoding="utf-8") as fh:
            seed = json.load(fh)
    seed[THREAD_ID] = manifest_blob_id
    with open(SEED_FILE, "w", encoding="utf-8") as fh:
        json.dump(seed, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"[reseed] Wrote {SEED_FILE} -> {THREAD_ID}: {manifest_blob_id}")

    # Re-verify exactly like the API does on a fresh host: seed key -> blob id.
    prod = _verify(manifest_blob_id, f"production verify via {THREAD_ID!r}")
    try:
        os.remove(iso_cache)
    except OSError:
        pass
    if not (prod["ok"] and prod["tampered_count"] == 0
            and prod["verified"] == prod["checkpoint_count"]):
        print("[reseed] WARNING: production-path verify is not a clean full PASS.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
