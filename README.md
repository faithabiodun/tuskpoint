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

Plain-English search is powered by [MemWal](https://memory.walrus.xyz).

- **PyPI:** https://pypi.org/project/tuskpoint-mcp
- **Docs:** https://tuskpoint.xyz/docs
- **MCP-URL:** https://tuskpoint-mcp.onrender.com/mcp


## What is TuskPoint?

- **A drop-in checkpointer.** `WalrusSaver` is a standard LangGraph
  `BaseCheckpointSaver`. Drop it into your graph and every checkpoint is
  serialized, gzipped, and stored as a content-addressed Walrus blob, the exact
  layer you rewind to.
- **Crash-proof by construction.** State lives on a decentralized network rather
  than in your process. A fresh process rehydrates the latest checkpoint and
  continues. The only thing kept locally is a blob pointer.
- **Git for agent runs.** `checkpoint_fork` branches any checkpoint into a new
  thread so you can replay a different path without touching the original.
- **Cryptographically tamper-evident.** Every blob is SHA-256 hashed at write
  time; `verify_trail` re-fetches each blob, recomputes its hash, and compares,
  so a swapped or corrupted blob surfaces as a `FAIL` step you can audit.
- **Durable rollback.** `checkpoint_rollback` re-writes an earlier state as a new
  head of the same thread. Append-only: nothing is deleted, so the audit trail
  stays intact and still verifies.
- **Cross-agent hand-off.** `handoff_checkpoint` emits a tiny descriptor (blob id
  + SHA-256); `adopt_checkpoint` re-fetches the blob, verifies the hash, and
  adopts it as a new thread, so a tampered blob is rejected before it becomes
  state.
- **Searchable in plain English.** A core part of TuskPoint: the MemWal layer
  writes a one-line summary per checkpoint, so an agent can recall its own past
  in plain language, pointers it then loads *exactly*.
- **All-in-one MCP server.** Eleven tools over stdio, plus `tuskpoint_info` which
  returns ready-to-paste client config.

## Summary of MCP tools

The server (`tuskpoint-mcp`) exposes these over stdio:

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

TuskPoint is a drop-in MCP plugin. One line wires it into any MCP client, no
clone, no server to run, no paths to set: `uvx` fetches and launches it and all
eleven tools appear in your agent.

### Add it to your client

A ready-to-use [`.mcp.json`](.mcp.json) is included, and the same block works
for every client; only the file location changes.

```json
{
  "mcpServers": {
    "tuskpoint": {
      "command": "uvx",
      "args": ["tuskpoint-mcp"],
      "env": {
        "WALRUS_AGGREGATOR_URL": "https://aggregator.walrus-testnet.walrus.space",
        "WALRUS_PUBLISHER_URL": "https://publisher.walrus-testnet.walrus.space"
      }
    }
  }
}
```

- **Claude Code:** `claude mcp add tuskpoint -- uvx tuskpoint-mcp`
- **Claude Desktop:** add the block to `claude_desktop_config.json`.
- **Cursor:** `.cursor/mcp.json`
- **Windsurf:** `~/.codeium/windsurf/mcp_config.json`
- **VS Code (Copilot):** `.vscode/mcp.json` (uses a `servers` key).
- **OpenAI Codex CLI:** `~/.codex/config.toml` (TOML).

Full per-client instructions: https://tuskpoint.xyz/docs/clients. Or, from any
client, call the `tuskpoint_info` tool and let the agent emit the right snippet.

Prefer the terminal? The same setup is served as plain text at one URL:

```bash
curl -sL https://tuskpoint.xyz/skills/setup
```

Reads from Walrus are public and free, so the plugin works out of the box on
testnet. Only writes need a publisher and semantic search needs MemWal
credentials, set them in the `env` block above or a `.env` (see `.env.example`).

> **Note:** `checkpoint_search` returns an explanatory message instead of
> failing when no MemWal credentials are present, so the server runs fine
> without them.

### See it live

The fastest way to watch a crash-and-resume, a diff, a rollback, and
plain-English search is the live dashboard: https://tuskpoint.xyz/dashboard.

### Run from source (contributors)

```bash
git clone https://github.com/faithabiodun/tuskpoint.git
cd tuskpoint
python -m pip install -e ".[all]"
cp .env.example .env   # then fill in your keys
```

From a checkout the server also runs with `python mcp_server/server.py` (a thin
shim around the packaged `tuskpoint-mcp` entry point), and
`python scripts/check_walrus.py` proves a live Walrus round-trip.

## Exact vs. semantic: why both?

- **Exact lookups are by ID.** `checkpoint_load` resolves the manifest entry →
  blob ID → Walrus GET → de-gzip → de-serialize. The blob you read is
  byte-for-byte the blob you wrote. This is the part you rewind to.
- **Semantic search is for discovery.** `checkpoint_search` asks MemWal for the
  nearest summaries, pointers carrying checkpoint IDs you then load exactly.
  Vector recall indexes the exact store; the blob stays the source of truth.

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
  mcp_server.py      All-in-one MCP server: 11 checkpoint tools + tuskpoint_info (FastMCP), exposed as the `tuskpoint-mcp` command
mcp_server/server.py Thin shim that runs the packaged server (for source checkouts)
demo/                researcher→writer agent + crash/resume/fork/audit/rollback/handoff/semantic demos
scripts/             check_walrus.py, check_memwal.py (standalone proofs)
web/                 Next.js site + docs (https://tuskpoint.xyz)
tests/               unit (no network) + integration (live Walrus) suites
```

## License

MIT, see [LICENSE](LICENSE).
