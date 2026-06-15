# TuskPoint: Verifiable LangGraph checkpoints on Walrus

TuskPoint is a drop-in [LangGraph](https://langchain-ai.github.io/langgraph/)
checkpointer that saves every step of an agent run as a verifiable
[Walrus](https://docs.wal.app) blob. When a process crashes, you resume from
exactly where it stopped, not from the beginning. From there you can **roll
back** to any earlier moment, **hand a run off** to another agent and have it
verify the bytes by hash, **fork** a checkpoint into a new thread, and **diff**,
**search**, and **audit** the whole history. It ships an all-in-one MCP server,
so any agent (Claude, Cursor, Windsurf, and more) can do all of this with a tool
call through 11 checkpoint tools.

Plain-English search is powered by [MemWal](https://memory.walrus.xyz), the
semantic memory layer for Walrus. TuskPoint writes a one-line summary of each
checkpoint to MemWal and uses its recall to find the right moment, then loads the
exact state from Walrus.

- **Docs:** https://tuskpoint.xyz/docs
- **Live run dashboard:** https://tuskpoint.xyz/dashboard

## What is TuskPoint?

- **A checkpointer, not a database.** `WalrusSaver` is a standard LangGraph
  `BaseCheckpointSaver`. Drop it into your graph and every checkpoint is
  serialized, gzipped, and stored as a content-addressed Walrus blob, the
  *exact* layer you rewind to.
- **Crash-proof by construction.** State lives on a decentralized network, not
  in your process. A fresh process rehydrates the latest checkpoint and
  continues. The only thing kept locally is a blob pointer.
- **Git for agent runs.** `checkpoint_fork` branches any checkpoint into a new
  thread so you can replay a different path without touching the original.
- **Cryptographically tamper-evident.** Every blob is SHA-256 hashed at write
  time; `verify_trail` re-fetches each blob, recomputes its hash, and compares,
  so a swapped or corrupted blob is a `FAIL`, not just a failed download.
- **Durable rollback.** `checkpoint_rollback` re-writes an earlier state as a new
  head of the same thread. Append-only: nothing is deleted, so the audit trail
  stays intact and still verifies.
- **Cross-agent hand-off.** `handoff_checkpoint` emits a tiny descriptor (blob id
  + SHA-256); `adopt_checkpoint` re-fetches the blob, verifies the hash, and
  adopts it as a new thread, so a tampered blob is rejected before it becomes
  state.
- **Searchable in plain English.** An optional MemWal layer writes a one-line
  summary per checkpoint, so an agent can recall its own past, pointers it then
  loads *exactly*.
- **All-in-one MCP server.** Eleven tools over stdio, plus `tuskpoint_info` which
  returns ready-to-paste client config.

## Summary of MCP tools

The server (`mcp_server/server.py`) exposes these over stdio:

| Tool | Category | What it does |
| --- | --- | --- |
| `checkpoint_save(thread_id, state_json)` | Write | Persist agent state as a new Walrus blob. |
| `checkpoint_fork(source_thread, source_id, new_thread)` | Write | Branch a checkpoint into a new thread (replay a different path). |
| `checkpoint_load(thread_id, checkpoint_id?)` | Read | Load a specific checkpoint (or the latest) by ID. |
| `checkpoint_list(thread_id)` | Read | List a thread's checkpoints, newest first, with lineage. |
| `checkpoint_resume(thread_id)` | Read | Return the latest state so an agent can continue. |
| `checkpoint_diff(thread_id, id_a, id_b)` | Read | Human-readable diff between two checkpoints. |
| `checkpoint_rollback(thread_id, checkpoint_id)` | Write | Durable, append-only undo: re-write an earlier state as a new head. |
| `handoff_checkpoint(thread_id, checkpoint_id, to_agent?)` | Write | Emit a portable, hash-stamped descriptor for another agent. |
| `adopt_checkpoint(handoff_json, new_thread_id)` | Write | Re-fetch + hash-verify a handoff and adopt it as a new thread. |
| `verify_trail(thread_id)` | Read | Re-hash every blob and compare to the stored SHA-256 (PASS/FAIL/UNVERIFIED). |
| `checkpoint_search(query)` | Discover | Semantic recall over checkpoint summaries (MemWal). |
| `tuskpoint_info()` | Meta | Describe the server and emit copy-paste client config. |

## Quick Start

### 1. Install

```bash
git clone https://github.com/faithabiodun/tuskpoint.git
cd tuskpoint
python -m pip install -e ".[all]"
```

### 2. Configure environment

```bash
cp .env.example .env   # then fill in your keys
```

All secrets come from environment variables (loaded from `.env`).
**Never commit your real `.env`**, it is git-ignored. Reads from Walrus are
public and free; only writes need a publisher and semantic search needs MemWal
credentials (see `.env.example`).

### 3. Prove the Walrus round-trip

```bash
python scripts/check_walrus.py
```

Writes a random blob to a publisher, reads it back from an aggregator, and
asserts the bytes are identical, printing the blob ID.

### 4. Run the crash / resume demo (the headline)

```bash
python demo/run_demo.py --real --part1   # run, persist, EXIT
python demo/run_demo.py --real --part2   # FRESH process resumes from Walrus
```

A researcher→writer agent is interrupted before the writer runs. `--part2`
starts a brand-new process that reads only the manifest blob ID from
`.walrus_threads.json`, pulls the checkpoint back from Walrus, and resumes to
completion.

### 5. Try fork, audit, rollback & hand-off

```bash
python demo/run_demo.py --fork      # branch a checkpoint into a new thread
python demo/run_demo.py --audit     # verify_trail (SHA-256) over a thread
python demo/run_demo.py --rollback  # append-only undo to an earlier checkpoint
python demo/run_demo.py --handoff   # Agent A hands a checkpoint to Agent B
```

> **On timing:** TuskPoint's own operations are effectively instant: a
> checkpoint save/load is a single gzip + Walrus round-trip, and reads are
> pooled and fetched in parallel. When a demo or MCP call *feels* slow, the
> wall-time is almost always one of two things outside the checkpointer:
> (1) the optional DeepSeek LLM the sample agent calls per node, and
> (2) the one-off `import` of `langchain_core`, a required LangGraph
> dependency. Neither is TuskPoint doing work; the checkpoint engine itself
> adds no measurable latency.

### 6. Start the MCP server

```bash
python mcp_server/server.py
```

### 7. Register with an MCP client

A ready-to-use [`.mcp.json`](.mcp.json) is included. The same block works for
every client; only the file location changes.

```json
{
  "mcpServers": {
    "tuskpoint": {
      "command": "python",
      "args": ["mcp_server/server.py"],
      "cwd": "/absolute/path/to/tuskpoint",
      "env": {
        "WALRUS_AGGREGATOR_URL": "https://aggregator.walrus-testnet.walrus.space",
        "WALRUS_PUBLISHER_URL": "https://publisher.walrus-testnet.walrus.space"
      }
    }
  }
}
```

- **Claude Desktop:** add the block to `claude_desktop_config.json`.
- **Claude Code:** `claude mcp add tuskpoint -- python mcp_server/server.py`
- **Cursor:** `.cursor/mcp.json`
- **Windsurf:** `~/.codeium/windsurf/mcp_config.json`

Full per-client instructions: https://tuskpoint.xyz/docs/clients

> **Note:** `checkpoint_search` returns an explanatory message instead of
> failing when no MemWal credentials are present, so the server runs fine
> without them.

## Exact vs. semantic: why both?

- **Exact lookups are by ID, never fuzzy.** `checkpoint_load` resolves the
  manifest entry → blob ID → Walrus GET → de-gzip → de-serialize. The blob you
  read is byte-for-byte the blob you wrote. This is the part you rewind to.
- **Semantic search is for discovery.** `checkpoint_search` asks MemWal for the
  nearest summaries, pointers carrying checkpoint IDs you then load exactly.
  Vector recall indexes the exact store; it is never the source of truth.

MemWal is the semantic memory layer TuskPoint builds on. TuskPoint writes a
one-line summary of each checkpoint to MemWal, and `checkpoint_search` uses
MemWal's recall to find the right moment, then hands you a pointer you load
exactly from Walrus. Semantic recall handles discovery; the content-addressed
blob stays the source of truth.

## Network: testnet by default, mainnet when you're ready

TuskPoint defaults to Walrus **testnet**, writes are free via a public
publisher, so you can try everything with zero setup or funds. Reads are public
and free on either network.

When you want durable, paid storage, switch to **mainnet** by setting both
environment variables (these take precedence over the defaults):

```bash
export WALRUS_PUBLISHER_URL=https://walrus-mainnet-publisher-1.staketab.org:443
export WALRUS_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space
```

Mainnet writes cost SUI (gas) + WAL (storage), so there is no public,
unauthenticated mainnet publisher; use a community publisher, run your own, or
use the upload relay with a funded key. See
https://tuskpoint.xyz/docs/mainnet.

## Tests

```bash
python -m pytest -m "not integration"   # fast unit tests, no network
python -m pytest -m integration         # live Walrus round-trip + resume
```

## What's included

```
src/langgraph_checkpoint_walrus/
  walrus_client.py   BlobStore protocol, InMemoryWalrusClient, real WalrusClient
  manifest.py        ThreadManifest / CheckpointEntry (id -> blob_id, lineage, blob_sha256)
  saver.py           WalrusSaver: gzip envelope per checkpoint, fork/rollback/handoff/verify_trail
  memwal_layer.py    MemWalLayer: build_summary + summarize_and_remember + search
mcp_server/server.py All-in-one MCP server: 11 checkpoint tools + tuskpoint_info (FastMCP)
demo/                researcher→writer agent + crash/resume/fork/audit/rollback/handoff/semantic demos
scripts/             check_walrus.py, check_memwal.py (standalone proofs)
web/                 Next.js site + docs (https://tuskpoint.xyz)
tests/               unit (no network) + integration (live Walrus) suites
```

## License

MIT, see [LICENSE](LICENSE).
