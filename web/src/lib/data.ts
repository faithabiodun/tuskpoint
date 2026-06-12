// Data powering the TuskPoint site.
//
// The checkpoint history, blob IDs, summaries, report, and semantic-search
// results below are REAL: they were produced by running the actual engine
// (WalrusSaver + MemWal + a live LangGraph agent) against Walrus and exported to
// `snapshot.json` via `scripts/export_snapshot.py`. No secrets ship to the site
// — only this exported record of one genuine run.

import snapshot from "./snapshot.json";

export type Tool = {
  name: string;
  signature: string;
  summary: string;
  category: "Write" | "Read" | "Discover";
  glyph: string; // short label used as a lightweight monospace icon
  returns: string;
  example: string;
};

export const TOOLS: Tool[] = [
  {
    name: "checkpoint_save",
    signature: "checkpoint_save(thread_id, state_json)",
    summary:
      "Serialize agent state, gzip it, and store it as an immutable Walrus blob. Also writes a one-line summary to MemWal.",
    category: "Write",
    glyph: "PUT",
    returns: "{ checkpoint_id, blob_id, thread_id }",
    example:
      'checkpoint_save("run-42", \'{"step":"research","sources":["a","b"]}\')',
  },
  {
    name: "checkpoint_load",
    signature: "checkpoint_load(thread_id, checkpoint_id?)",
    summary:
      "Load a specific checkpoint by ID (or the latest). Deterministic, content-addressed read straight from Walrus.",
    category: "Read",
    glyph: "GET",
    returns: "{ state, checkpoint_id, blob_id }",
    example: 'checkpoint_load("run-42", "0c3b84d1-…")',
  },
  {
    name: "checkpoint_list",
    signature: "checkpoint_list(thread_id)",
    summary:
      "List every checkpoint for a thread, newest first, with lineage, timestamps, and summaries from the manifest.",
    category: "Read",
    glyph: "LS",
    returns: "{ count, checkpoints[] }",
    example: 'checkpoint_list("run-42")',
  },
  {
    name: "checkpoint_resume",
    signature: "checkpoint_resume(thread_id)",
    summary:
      "Rehydrate the latest state so an agent can continue exactly where it left off after a crash.",
    category: "Read",
    glyph: "RES",
    returns: "{ state, checkpoint_id }",
    example: 'checkpoint_resume("run-42")',
  },
  {
    name: "checkpoint_diff",
    signature: "checkpoint_diff(thread_id, id_a, id_b)",
    summary:
      "Compare two checkpoints and report exactly what was added, removed, or changed between them.",
    category: "Read",
    glyph: "DIFF",
    returns: "{ added, removed, changed, human_readable }",
    example: 'checkpoint_diff("run-42", id_a, id_b)',
  },
  {
    name: "checkpoint_search",
    signature: "checkpoint_search(query)",
    summary:
      "Ask a question in plain English. MemWal returns the nearest checkpoint summaries — pointers you then load exactly.",
    category: "Discover",
    glyph: "FIND",
    returns: "{ results: [{ text, distance }] }",
    example: 'checkpoint_search("when did the writer start?")',
  },
  {
    name: "checkpoint_fork",
    signature: "checkpoint_fork(source_thread, source_id, new_thread)",
    summary:
      "Git-branch an agent run. Copy any checkpoint into a new thread to replay a different path — the original stays untouched.",
    category: "Write",
    glyph: "FORK",
    returns: "{ new_thread_id, checkpoint_id, blob_id, forked_from }",
    example: 'checkpoint_fork("run-42", "0c3b84d1-…", "run-42-alt")',
  },
  {
    name: "verify_trail",
    signature: "verify_trail(thread_id)",
    summary:
      "Audit a thread end-to-end. Re-fetches every content-addressed blob so tampering or corruption shows up as a failed step.",
    category: "Read",
    glyph: "AUDIT",
    returns: "{ ok, checkpoint_count, verified, steps[] }",
    example: 'verify_trail("run-42")',
  },
];

export type Checkpoint = {
  id: string;
  shortId: string;
  step: number;
  node: string;
  blobId: string;
  parent: string | null;
  timestamp: string;
  summary: string;
  state: Record<string, unknown>;
};

export type Thread = {
  id: string;
  title: string;
  topic: string;
  manifestBlobId: string;
  checkpoints: Checkpoint[];
};

// Strip the "[thread=… checkpoint=… step=N] " prefix MemWal stores, leaving the
// human sentence for display.
function cleanSummary(text: string): string {
  const m = text.match(/^\[[^\]]*\]\s*(.*)$/);
  return (m ? m[1] : text).trim();
}

const rawThread = snapshot.thread;

export const THREAD: Thread = {
  id: rawThread.id,
  title: rawThread.title,
  topic: rawThread.topic,
  manifestBlobId: rawThread.manifestBlobId,
  checkpoints: rawThread.checkpoints.map((c) => ({
    id: c.id,
    shortId: c.shortId,
    step: c.step,
    node: c.node,
    blobId: c.blobId,
    parent: c.parent,
    timestamp: c.timestamp,
    summary: cleanSummary(c.summary),
    state: c.state as Record<string, unknown>,
  })),
};

export const RUN_META = {
  generatedAt: snapshot.generatedAt,
  topic: snapshot.topic,
  report: snapshot.report,
  checkpointCount: THREAD.checkpoints.length,
  manifestBlobId: THREAD.manifestBlobId,
};

export const STACK = [
  {
    name: "LangGraph",
    role: "Agent framework — TuskPoint plugs into its checkpoint API.",
  },
  {
    name: "Walrus",
    role: "Decentralized blob storage — the durable source of truth.",
  },
  {
    name: "MemWal",
    role: "Semantic memory — natural-language recall over history.",
  },
  {
    name: "MCP",
    role: "Model Context Protocol — eight tools any agent can call.",
  },
];

export const REPO_URL = "https://github.com/faithabiodun/tuskpoint";

// Mainnet aggregator — used when an operator runs the engine on mainnet.
export const WALRUS_AGGREGATOR =
  "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/";

// The sample run shown on the site, and the live dashboard, run on the Walrus
// testnet (free writes), so evidence blobs resolve on the testnet aggregator.
// Running the same engine on mainnet only requires pointing the engine's
// WALRUS_PUBLISHER_URL / WALRUS_AGGREGATOR_URL at mainnet.
export const EVIDENCE_AGGREGATOR =
  "https://aggregator.walrus-testnet.walrus.space/v1/blobs/";
