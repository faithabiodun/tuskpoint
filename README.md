# TuskPoint — `langgraph-checkpoint-walrus`

Verifiable LangGraph agent state on [Walrus](https://docs.wal.app), with
semantic recall over checkpoint history via
[MemWal](https://docs.wal.app/walrus-memory).

> **Hackathon project — Walrus track.** Built in small, testable increments.

## What it is

Two layers:

1. **`WalrusSaver`** — a drop-in LangGraph `BaseCheckpointSaver`. Every
   checkpoint is serialized with LangGraph's own serde, gzipped, and stored as
   an immutable **Walrus blob** (the *exact* layer). A per-thread JSON
   **manifest** maps `checkpoint_id -> {blob_id, parent, timestamp, summary}`.
   On every save it also writes a one-sentence natural-language **summary** to
   MemWal (the *semantic* layer), so an agent can later *search its own past*.

2. **`mcp_server`** — an MCP server exposing six checkpoint tools
   (save / load / list / resume / diff / search) over stdio. It complements,
   and does not duplicate, MemWal's own MCP.

## Architecture

```
                      ┌─────────────────────────────────────────┐
   LangGraph agent ──▶│             WalrusSaver                  │
   (put / get_tuple)  │  BaseCheckpointSaver[str]                │
                      │                                          │
                      │  EXACT layer            SEMANTIC layer   │
                      │  ───────────            ──────────────   │
                      │  serde→gzip→blob        build_summary()  │
                      │       │                       │          │
                      └───────┼───────────────────────┼──────────┘
                              ▼                        ▼
                    ┌──────────────────┐     ┌──────────────────┐
                    │  Walrus testnet  │     │      MemWal       │
                    │ publisher PUT /  │     │ remember / recall │
                    │ aggregator GET   │     │ (vector search)   │
                    └──────────────────┘     └──────────────────┘
                              ▲
                              │ latest manifest blob id cached in
                              │ .walrus_threads.json  (only local state)
                              ▼
                      ┌──────────────────┐
                      │  mcp_server      │  6 tools over stdio:
                      │  (FastMCP)       │  save load list resume diff search
                      └──────────────────┘
```

### Exact vs. semantic — why both?

- **Exact lookups are by ID, never fuzzy.** `checkpoint_load(thread, id)`
  resolves the manifest entry → blob ID → Walrus GET → de-gzip → de-serialize.
  This is deterministic and content-addressed: the blob you read is byte-for-byte
  the blob you wrote. This is the part you *rewind to*.
- **Semantic search is for discovery.** `checkpoint_search("when did the
  writer start?")` asks MemWal for the nearest summaries. It returns *pointers*
  (summaries with thread/checkpoint IDs), which you then load *exactly*. Vector
  recall is never the source of truth — it's an index into the exact store.

### How this differs from MemWal's own MCP

MemWal ships an MCP for free-form **memories** (`remember` / `recall` /
`analyze` / `restore` / `login` / `logout`). TuskPoint manages durable,
exactly-addressable **checkpoints** — agent state you can resume a graph from.
The only overlap, `checkpoint_search`, is deliberately scoped to *our*
checkpoint summaries, not general memories.

## Quick start

```bash
python -m pip install -e ".[all]"
cp .env.example .env   # then fill in your keys
```

All secrets come from environment variables (loaded from `.env`). See
[`.env.example`](.env.example) for the full list. **Never commit your real
`.env`** — it is git-ignored.

## Proofs and demos

Each build step has a runnable proof.

### 1. Walrus blob round-trip

```bash
python scripts/check_walrus.py
```

Writes a random blob to a testnet **publisher**, reads it back from an
**aggregator**, and asserts the bytes are identical — printing the blob ID.

### 2. MemWal remember / recall

```bash
python scripts/check_memwal.py
```

Remembers a sentence, then recalls it semantically and prints the distance.

### 3–4. Crash / resume demo (the headline)

```bash
# In-memory fake backend (single process, interrupt then resume):
python demo/run_demo.py

# REAL Walrus testnet, surviving a genuine process kill:
python demo/run_demo.py --real --part1   # run to interrupt, persist, EXIT
python demo/run_demo.py --real --part2   # FRESH process rehydrates from Walrus
```

A researcher→writer agent is interrupted before the writer runs. `--part2`
starts a brand-new process that reads only the manifest blob ID from
`.walrus_threads.json`, pulls the checkpoint back from Walrus, and resumes the
writer to completion. That is the "survive a process kill" proof.

### 5. Semantic self-search

```bash
python demo/run_demo.py --semantic
```

Runs the agent on real Walrus + MemWal, then asks *"when did the writer
start?"* and prints the nearest checkpoint summaries — the agent searching its
own history.

## MCP server

Six tools over stdio: `checkpoint_save`, `checkpoint_load`, `checkpoint_list`,
`checkpoint_resume`, `checkpoint_diff`, `checkpoint_search`.

Run it directly:

```bash
python mcp_server/server.py
```

### Register with an MCP client

A ready-to-use [`.mcp.json`](.mcp.json) is included. For Claude Desktop, add
the equivalent to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tuskpoint-checkpoints": {
      "command": "python",
      "args": ["mcp_server/server.py"],
      "cwd": "C:/Users/User/Documents/tuskpoint",
      "env": {
        "WALRUS_PUBLISHER_URL": "https://publisher.walrus-testnet.walrus.space",
        "WALRUS_AGGREGATOR_URL": "https://aggregator.walrus-testnet.walrus.space",
        "WALRUS_THREADS_CACHE": ".walrus_threads.json"
      }
    }
  }
}
```

`checkpoint_search` returns an explanatory message instead of failing if no
MemWal credentials are present, so the server runs fine without them.

## Tests

```bash
python -m pytest -m "not integration"   # 16 fast unit tests, no network
python -m pytest -m integration         # live Walrus round-trip + resume
```

## Project layout

```
src/langgraph_checkpoint_walrus/
  walrus_client.py   BlobStore protocol, InMemoryWalrusClient, real WalrusClient
  manifest.py        ThreadManifest / CheckpointEntry (id -> blob_id, lineage)
  saver.py           WalrusSaver (BaseCheckpointSaver): gzip envelope per checkpoint
  memwal_layer.py    MemWalLayer: build_summary + summarize_and_remember + search
mcp_server/server.py 6 checkpoint tools over stdio (FastMCP)
demo/                researcher→writer agent + crash/resume/semantic demos
scripts/             check_walrus.py, check_memwal.py (standalone proofs)
tests/               unit (no network) + integration (live Walrus) suites
```

## 90-second video demo script

1. **(0:00)** Show `check_walrus.py` — "agent state lands on Walrus, byte-identical round-trip."
2. **(0:15)** Run `demo/run_demo.py --real --part1` — agent interrupts before the writer, exits.
3. **(0:35)** Point at `.walrus_threads.json` — "only a blob pointer survives locally; the state is on the network."
4. **(0:45)** Run `--real --part2` in a fresh shell — "new process, resumes from Walrus, writer finishes."
5. **(1:05)** Run `--semantic` — ask *"when did the writer start?"*, show ranked summaries.
6. **(1:20)** Show the MCP server tools list — "any MCP agent can save/load/diff/search checkpoints."
