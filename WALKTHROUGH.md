# TuskPoint: A Plain-Language Walkthrough

This document explains the whole project as if you've never seen it. No jargon
without a definition. Read top to bottom.

---

## 1. The one-sentence pitch

> **TuskPoint lets an AI agent save its work to a decentralized network so it
> can survive a crash, rewind to any past moment, and search its own history in
> plain English.**

That's it. Everything below is just *how* it does that.

---

## 2. The problem we're solving

When you build an AI **agent** (a program that does multi-step work — research,
then write, then review, etc.), it holds a lot of state in memory: what it's
found so far, what step it's on, partial results.

If the program crashes, or you close it, **all of that is gone.** You start over.

The usual fix is a **checkpointer**: after each step, write the agent's state
somewhere so you can reload it later. LangGraph (a popular agent framework)
supports checkpointers, and normally you'd save to a database like Postgres.

**TuskPoint saves checkpoints to Walrus instead** — a decentralized storage
network. So your agent's memory doesn't live on one server you have to babysit;
it lives on the network, content-addressed and verifiable.

---

## 3. The three outside pieces (so the names make sense)

| Name | What it is | What we use it for |
|------|-----------|--------------------|
| **LangGraph** | A framework for building agents as a graph of steps ("nodes"). | We plug into its checkpoint system. |
| **Walrus** | Decentralized blob storage. You `PUT` bytes and get back a **blob ID**; later you `GET` that blob ID to read the exact bytes back. | This is where checkpoints actually live. |
| **MemWal** | A "memory" service with **semantic search** — you store sentences, then ask questions in natural language and it finds the closest matches. | We use it so the agent can *search its own past* in plain English. |

A **blob** = a chunk of bytes. A **blob ID** = a unique fingerprint for those
bytes. Same bytes → same ID. Read by ID → get exactly those bytes back.

---

## 4. The two layers of TuskPoint

### Layer 1: `WalrusSaver` (the engine)

This is a **drop-in checkpointer** for LangGraph. Your agent doesn't know or
care that it's special — to LangGraph it looks like any other saver. But under
the hood, each time the agent saves a checkpoint, `WalrusSaver` does two things:

**A) The EXACT layer (the source of truth)**
1. Take the agent's state.
2. Serialize it (turn it into bytes) using LangGraph's own serializer.
3. **Gzip** it (compress it).
4. `PUT` it to Walrus → get back a **blob ID**.
5. Record that blob ID in a small **manifest**.

> A **manifest** is just a per-conversation index. It's a JSON list that says:
> "checkpoint #1 is blob `abc`, its parent was nothing, saved at 10:00, summary
> 'started research'. Checkpoint #2 is blob `def`, parent was #1, ..." and so on.
> The manifest itself is also stored as a Walrus blob. The **only** thing kept
> on your local disk is the blob ID of the latest manifest, in a tiny file
> called `.walrus_threads.json`.

This is "exact" because loading is always **by ID** — never guessing. You ask
for checkpoint `def`, you get the exact bytes of `def` back. Perfect for
*rewinding*.

**B) The SEMANTIC layer (the search index)**
On every save, it also writes a **one-sentence summary** of what happened (e.g.
*"state advanced (step 1); channels now set: sources, topic"*) to **MemWal**.

Later you can ask, in English, *"when did the writer start?"* and MemWal returns
the closest summaries. Those summaries carry the checkpoint IDs — so you find
something fuzzily, then load it exactly. **Search to discover, ID to retrieve.**

### Layer 2: The MCP server (the remote control)

**MCP** (Model Context Protocol) is a standard way for AI apps (like Claude
Desktop) to call external **tools**. TuskPoint ships a small MCP server exposing
six tools, so *any* MCP-capable agent can drive the checkpoint store:

| Tool | What it does |
|------|--------------|
| `checkpoint_save` | Save a state dict → returns checkpoint ID + blob ID. |
| `checkpoint_load` | Load a specific checkpoint (or the latest) by ID. |
| `checkpoint_list` | List a conversation's checkpoints, newest first. |
| `checkpoint_resume` | Shortcut: load the latest state to continue work. |
| `checkpoint_diff` | Show what changed between two checkpoints. |
| `checkpoint_search` | Plain-English search over checkpoint summaries (MemWal). |

> **Why not just use MemWal's own MCP?** MemWal already has an MCP for general
> "memories." Ours is different on purpose: it manages **checkpoints** — exact,
> rewindable agent state — not free-form notes. We don't duplicate its tools.

---

## 5. How the headline demo proves it works

The demo agent is tiny: a **researcher** node (gathers sources) followed by a
**writer** node (writes a report). We deliberately **interrupt** it right before
the writer runs.

```bash
python demo/run_demo.py --real --part1
```
- Runs the researcher on real Walrus.
- Saves the checkpoint to the network.
- **Exits the program** before the writer ever runs.
- The only thing left on disk is one blob-ID pointer.

```bash
python demo/run_demo.py --real --part2
```
- A **brand-new process** starts (the original is dead — like a real crash).
- It reads the manifest blob ID from `.walrus_threads.json`.
- Pulls the checkpoint back **from Walrus**.
- Resumes the writer and finishes the report.

That's the whole value proposition demonstrated literally: **the agent died,
and its memory survived on the network.**

And the semantic demo:
```bash
python demo/run_demo.py --semantic
```
runs the agent, then asks *"when did the writer start?"* and prints ranked
summaries — the agent searching its own history.

---

## 6. How the code is organized

```
src/langgraph_checkpoint_walrus/   ← the engine (Layer 1)
  walrus_client.py    Talks to Walrus over HTTP (PUT/GET). Has a fake in-memory
                      version for fast tests, and the real testnet client.
  manifest.py         The per-conversation index (id → blob_id, parent, time, summary).
  saver.py            WalrusSaver: serialize → gzip → store; load by ID; the glue.
  memwal_layer.py     Writes summaries to MemWal and runs the English search.

mcp_server/server.py  ← the remote control (Layer 2): the six tools over stdio.

demo/                 ← the researcher→writer agent and the crash/resume demos.
scripts/              ← tiny standalone "does this even work?" proofs.
tests/                ← automated tests (most run with no network).
```

---

## 7. The mental model to remember

```
   Agent does a step
          │
          ▼
   WalrusSaver.put()
     ├── serialize + gzip + PUT to Walrus  →  blob ID   (EXACT: the truth)
     ├── record blob ID in the manifest    →  on Walrus too
     └── write a 1-line summary to MemWal   →  (SEMANTIC: the search index)

   Later…
     • Know the ID?      → load it exactly from Walrus.
     • Only remember it vaguely? → search MemWal in English → get the ID → load exactly.
```

**Exact for trust. Semantic for discovery. Walrus for durability.**
That's TuskPoint.
