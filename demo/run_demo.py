"""Crash/resume demonstration for the researcher -> writer agent.

Two backends:

* **fake** (default): in-memory Walrus stand-in. For the two-part flow, the
  fake's blobs are pickled between runs so a separate process can restore them.
* **--real**: the live Walrus HTTP client (mainnet by default). Here the two-part flow needs
  no pickling at all — checkpoints live on Walrus and the latest manifest blob
  ID is cached in the threads file, so ``--part2`` in a genuinely fresh process
  rehydrates state straight from the network. This is the real "survive a
  process kill" proof.

Usage:
    python demo/run_demo.py                  # fake, interrupt+resume, one process
    python demo/run_demo.py --part1          # fake: run to interrupt, persist, exit
    python demo/run_demo.py --part2          # fake: restore, resume to completion

    python demo/run_demo.py --real --part1   # REAL Walrus: run to interrupt, exit
    python demo/run_demo.py --real --part2   # REAL Walrus: fresh process resumes

    python demo/run_demo.py --semantic       # REAL Walrus + MemWal: run, then ask
                                             # "when did the writer start?"

    python demo/run_demo.py --fork           # fake: run, then branch a checkpoint
                                             # into a new thread ("git for runs")
    python demo/run_demo.py --audit          # fake: run, then verify_trail the
                                             # thread's blob chain end-to-end
    python demo/run_demo.py --rollback       # fake: run, then roll the thread
                                             # back to its first checkpoint

    Add --real to --fork / --audit / --rollback to run them against live Walrus.
"""

from __future__ import annotations

import os
import sys
import pickle

# Make 'demo' imports work whether run as a module or a script.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv  # noqa: E402

from agent import build_agent  # noqa: E402
from langgraph_checkpoint_walrus import (  # noqa: E402
    WalrusSaver,
    InMemoryWalrusClient,
    WalrusClient,
)

load_dotenv()

THREAD_ID = "demo-thread"
BLOBS_FILE = os.path.join(os.path.dirname(__file__), ".demo_fake_blobs.pkl")
THREADS_CACHE = os.path.join(os.path.dirname(__file__), ".demo_threads.json")
TOPIC = "decentralized storage on Walrus"


def _persist_fake(client: InMemoryWalrusClient) -> None:
    """Pickle the fake's blob dict so a later 'process' can restore it."""
    with open(BLOBS_FILE, "wb") as fh:
        pickle.dump(client._blobs, fh)


def _restore_fake() -> InMemoryWalrusClient:
    """Rebuild an in-memory fake from the pickled blob dict (or empty)."""
    client = InMemoryWalrusClient()
    if os.path.exists(BLOBS_FILE):
        with open(BLOBS_FILE, "rb") as fh:
            client._blobs = pickle.load(fh)
    return client


def _make_client(real: bool, *, restore: bool = False):
    """Return a blob-store client: real Walrus, or the fake (optionally restored)."""
    if real:
        return WalrusClient()
    return _restore_fake() if restore else InMemoryWalrusClient()


def _config() -> dict:
    return {"configurable": {"thread_id": THREAD_ID}}


def run_part1(real: bool) -> None:
    """Run until the interrupt before the writer, persist state, and exit."""
    client = _make_client(real)
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent = build_agent(saver, interrupt_before_writer=True)

    backend = "REAL Walrus network" if real else "in-memory fake"
    print(f"[part1] Backend: {backend}")
    print(f"[part1] Starting agent on topic: {TOPIC!r}")
    agent.invoke({"topic": TOPIC}, _config())

    snap = agent.get_state(_config())
    print(f"[part1] Paused. Next node to run: {snap.next}")
    print(f"[part1] Sources gathered ({len(snap.values.get('sources', []))}):")
    for s in snap.values.get("sources", []):
        print(f"          - {s}")
    print(f"[part1] Report so far: {snap.values.get('report')!r}")

    if not real:
        _persist_fake(client)
        print(f"[part1] Persisted {len(client)} fake blobs.")
    else:
        # State already durable on Walrus; only the manifest pointer is local.
        print(f"[part1] State is on Walrus. Manifest pointer cached locally.")
    print("[part1] Exiting BEFORE the writer ran. Run --part2 to resume.\n")


def run_part2(real: bool) -> None:
    """Restore in a 'fresh process' and resume to completion."""
    client = _make_client(real, restore=True)
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent = build_agent(saver, interrupt_before_writer=True)

    backend = "REAL Walrus network" if real else "in-memory fake"
    print(f"[part2] Backend: {backend}")
    snap = agent.get_state(_config())
    print(f"[part2] Restored. Resuming; next node: {snap.next}")
    if not snap.next:
        print("[part2] Nothing to resume (did you run --part1 first?).")
        return

    final = agent.invoke(None, _config())
    print("[part2] Writer finished. Final report:")
    print(f"          {final.get('report')}")
    print("[part2] Resume from checkpoint SUCCESS.\n")


def run_full(real: bool) -> None:
    """Interrupt then resume within a single process, sharing one client."""
    client = _make_client(real)
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent = build_agent(saver, interrupt_before_writer=True)

    backend = "REAL Walrus network" if real else "in-memory fake"
    print(f"[full] Backend: {backend}")
    print(f"[full] Starting agent on topic: {TOPIC!r}")
    agent.invoke({"topic": TOPIC}, _config())
    snap = agent.get_state(_config())
    print(f"[full] Paused before writer. Next: {snap.next}")
    print(f"[full] Sources: {snap.values.get('sources')}")

    # Fresh saver over the SAME client + cache (in-process 'restart').
    saver2 = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent2 = build_agent(saver2, interrupt_before_writer=True)
    print("[full] Resuming in a fresh saver instance...")
    final = agent2.invoke(None, _config())
    print("[full] Final report:")
    print(f"        {final.get('report')}")
    print("[full] Interrupt + resume SUCCESS.\n")


def run_semantic() -> None:
    """Run the agent on real Walrus with the MemWal layer, then query history.

    After the graph completes, every checkpoint has a one-sentence summary in
    MemWal. We then ask, in natural language, "when did the writer start?" and
    print the nearest matching summaries — the agent searching its own past.
    """
    from langgraph_checkpoint_walrus import MemWalLayer

    print("[semantic] Building MemWal layer from .env...")
    layer = MemWalLayer.from_env()

    client = WalrusClient()
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE, memwal_layer=layer)
    agent = build_agent(saver)  # no interrupt; run to completion

    thread_id = f"semantic-{os.getpid()}"
    config = {"configurable": {"thread_id": thread_id}}
    print(f"[semantic] Running agent (thread={thread_id}) on topic: {TOPIC!r}")
    final = agent.invoke({"topic": TOPIC}, config)
    print(f"[semantic] Done. Report length: {len(final.get('report', ''))} chars.")
    print("[semantic] Each checkpoint's summary was written to MemWal.\n")

    query = "when did the writer start?"
    print(f"[semantic] Searching agent history: {query!r}")
    hits = saver.search_history(query, limit=5)
    if not hits:
        print("[semantic] No hits (memories may still be indexing; re-run to retry).")
        return
    for h in hits:
        print(f"   [distance={h['distance']:.4f}] {h['text']}")
    print("[semantic] Semantic self-search SUCCESS.\n")


def run_fork(real: bool) -> None:
    """Run the agent, then fork its latest checkpoint into a new thread.

    This is the "git branch for agent runs" proof: we take a known-good
    checkpoint and create a brand-new thread from it, leaving the original
    untouched. The fork records a ``forked_from`` lineage so the manifest can
    describe a tree of runs.
    """
    client = _make_client(real)
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent = build_agent(saver)  # run to completion

    backend = "REAL Walrus network" if real else "in-memory fake"
    source_thread = f"fork-src-{os.getpid()}"
    config = {"configurable": {"thread_id": source_thread}}
    print(f"[fork] Backend: {backend}")
    print(f"[fork] Running source agent (thread={source_thread})...")
    agent.invoke({"topic": TOPIC}, config)

    snap = agent.get_state(config)
    source_cp = snap.config["configurable"]["checkpoint_id"]
    print(f"[fork] Source checkpoint: {source_cp}")

    new_thread = f"fork-alt-{os.getpid()}"
    result = saver.fork(
        source_thread_id=source_thread,
        source_checkpoint_id=source_cp,
        new_thread_id=new_thread,
    )
    print(f"[fork] Forked into new thread: {result['new_thread_id']}")
    print(f"[fork]   new checkpoint: {result['checkpoint_id']}")
    print(f"[fork]   blob id:        {result['blob_id']}")
    print(f"[fork]   forked_from:    {result['forked_from']}")
    print("[fork] Fork SUCCESS — original thread is untouched.\n")


def run_audit(real: bool) -> None:
    """Run the agent, then verify every checkpoint blob in the thread.

    ``verify_trail`` re-fetches each content-addressed blob in order. Because
    blob IDs are derived from content, a clean pass proves the run is intact and
    tamper-evident.
    """
    client = _make_client(real)
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent = build_agent(saver)

    backend = "REAL Walrus network" if real else "in-memory fake"
    thread_id = f"audit-{os.getpid()}"
    config = {"configurable": {"thread_id": thread_id}}
    print(f"[audit] Backend: {backend}")
    print(f"[audit] Running agent (thread={thread_id})...")
    agent.invoke({"topic": TOPIC}, config)

    report = saver.verify_trail(thread_id)
    print(
        f"[audit] Verified {report['verified']}/{report['checkpoint_count']} "
        f"checkpoints, {report['tampered_count']} tampered. ok={report['ok']}"
    )
    for step in report["steps"]:
        print(
            f"   [{step['status']:<10}] {step['checkpoint_id']}  "
            f"blob={step['blob_id']}"
        )
    print("[audit] Audit trail SUCCESS.\n" if report["ok"] else "[audit] FAILED.\n")


def run_rollback(real: bool) -> None:
    """Run the agent, then roll the thread back to its first checkpoint.

    Rollback is a durable, auditable "undo": the early checkpoint's state is
    written back as a new head of the SAME thread. The intervening checkpoints
    are never deleted, so the thread's verifiable trail stays intact and the
    rollback is itself a recorded step. After it, ``resume`` returns the
    restored state.
    """
    client = _make_client(real)
    saver = WalrusSaver(client, threads_cache_path=THREADS_CACHE)
    agent = build_agent(saver)

    backend = "REAL Walrus network" if real else "in-memory fake"
    thread_id = f"rollback-{os.getpid()}"
    config = {"configurable": {"thread_id": thread_id}}
    print(f"[rollback] Backend: {backend}")
    print(f"[rollback] Running agent (thread={thread_id})...")
    agent.invoke({"topic": TOPIC}, config)

    before = saver._load_manifest(thread_id).ordered_ids(newest_first=False)
    # Roll back to the checkpoint right after the researcher ran (sources
    # gathered, report not yet written) — a meaningful mid-run state, not the
    # empty genesis.
    early_id = before[1] if len(before) > 1 else before[0]
    print(f"[rollback] Thread has {len(before)} checkpoints.")
    print(f"[rollback] Rolling back to an earlier checkpoint: {early_id}")

    result = saver.rollback_to(thread_id, early_id)
    after = saver._load_manifest(thread_id).ordered_ids(newest_first=False)
    print(f"[rollback]   new head:         {result['checkpoint_id']}")
    print(f"[rollback]   restored_from:    {result['restored_from']}")
    print(f"[rollback]   blob id:          {result['blob_id']}")
    print(
        f"[rollback] History preserved: {len(before)} -> {len(after)} "
        "checkpoints (append-only)."
    )

    snap = agent.get_state(config)
    print(f"[rollback] Live head is now the restored state: {snap.values}")
    report = saver.verify_trail(thread_id)
    print(
        f"[rollback] verify_trail ok={report['ok']} "
        f"({report['verified']}/{report['checkpoint_count']} PASS).\n"
    )


def main() -> int:
    """Dispatch based on flags. ``--real`` selects the live Walrus backend."""
    args = sys.argv[1:]
    real = "--real" in args
    if "--semantic" in args:
        run_semantic()
    elif "--fork" in args:
        run_fork(real)
    elif "--audit" in args:
        run_audit(real)
    elif "--rollback" in args:
        run_rollback(real)
    elif "--part1" in args:
        run_part1(real)
    elif "--part2" in args:
        run_part2(real)
    else:
        run_full(real)
    return 0


if __name__ == "__main__":
    sys.exit(main())
