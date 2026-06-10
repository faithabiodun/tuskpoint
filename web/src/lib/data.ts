// Static data powering the TuskPoint showcase + interactive mock dashboard.
// NOTE: This is demo data only. No secrets, no live network calls. The real
// engine (WalrusSaver + MCP server) lives in the Python package at the repo root.

export type Tool = {
  name: string;
  signature: string;
  summary: string;
  category: "Write" | "Read" | "Discover";
  icon: string; // emoji glyph used as a lightweight icon
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
    icon: "💾",
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
    icon: "📥",
    returns: "{ state, checkpoint_id, blob_id }",
    example: 'checkpoint_load("run-42", "0c3b84d1-…")',
  },
  {
    name: "checkpoint_list",
    signature: "checkpoint_list(thread_id)",
    summary:
      "List every checkpoint for a thread, newest first, with lineage, timestamps, and summaries from the manifest.",
    category: "Read",
    icon: "🗂️",
    returns: "{ count, checkpoints[] }",
    example: 'checkpoint_list("run-42")',
  },
  {
    name: "checkpoint_resume",
    signature: "checkpoint_resume(thread_id)",
    summary:
      "Convenience shortcut: rehydrate the latest state so an agent can continue exactly where it left off after a crash.",
    category: "Read",
    icon: "⏯️",
    returns: "{ state, checkpoint_id }",
    example: 'checkpoint_resume("run-42")',
  },
  {
    name: "checkpoint_diff",
    signature: "checkpoint_diff(thread_id, id_a, id_b)",
    summary:
      "Compare two checkpoints and report exactly what was added, removed, or changed between them.",
    category: "Read",
    icon: "🔀",
    returns: "{ added, removed, changed, human_readable }",
    example: 'checkpoint_diff("run-42", id_a, id_b)',
  },
  {
    name: "checkpoint_search",
    signature: "checkpoint_search(query)",
    summary:
      "Ask a question in plain English. MemWal returns the nearest checkpoint summaries — pointers you then load exactly.",
    category: "Discover",
    icon: "🔎",
    returns: "{ results: [{ text, distance }] }",
    example: 'checkpoint_search("when did the writer start?")',
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

// A realistic researcher -> writer run, mirroring demo/run_demo.py.
export const THREADS: Thread[] = [
  {
    id: "demo-thread",
    title: "Researcher → Writer",
    topic: "decentralized storage on Walrus",
    manifestBlobId: "5D2_mNh4eAh3PceWKEuCu8d1Rz5IJpP5iTW93CsaxX8",
    checkpoints: [
      {
        id: "1f164b8d-6dab-62f4-bfff-ac76d337a658",
        shortId: "1f164b8d…a658",
        step: -1,
        node: "__input__",
        blobId: "iz4CDArslKAYmd-jiK5p1ZvFhveY_WUjb4L1_ZdwTC0",
        parent: null,
        timestamp: "2026-06-10T11:49:34Z",
        summary: "the graph received its initial input.",
        state: { topic: "decentralized storage on Walrus" },
      },
      {
        id: "1f164b8d-6db7-6550-8000-ceaf240c9ba5",
        shortId: "1f164b8d…9ba5",
        step: 0,
        node: "researcher",
        blobId: "0VdRqkOWime3bhvqAdBMdObgrW-REYkwJRYhiE_G8bk",
        parent: "1f164b8d-6dab-62f4-bfff-ac76d337a658",
        timestamp: "2026-06-10T11:50:14Z",
        summary: "state advanced (step 0); channels now set: topic.",
        state: { topic: "decentralized storage on Walrus" },
      },
      {
        id: "1f164b8d-6dbd-6a49-8001-04bf11ec36b7",
        shortId: "1f164b8d…6cb7",
        step: 1,
        node: "researcher",
        blobId: "tT-iOiaWfts7_n5gVmbeD2LxA4vGxAN3XIhP_4OONdw",
        parent: "1f164b8d-6db7-6550-8000-ceaf240c9ba5",
        timestamp: "2026-06-10T11:50:56Z",
        summary: "state advanced (step 1); channels now set: sources, topic.",
        state: {
          topic: "decentralized storage on Walrus",
          sources: [
            "Walrus HTTP API — publisher/aggregator",
            "MemWal SDK — remember/recall",
            "LangGraph BaseCheckpointSaver",
          ],
        },
      },
      {
        id: "1f164b8d-6dc0-6c7d-8002-e3ddfb68dd3a",
        shortId: "1f164b8d…dd3a",
        step: 2,
        node: "writer",
        blobId: "-TdwRA2H9oKjvlX5qrbok6F0N1EqUJXzhTscz98qP1I",
        parent: "1f164b8d-6dbd-6a49-8001-04bf11ec36b7",
        timestamp: "2026-06-10T11:51:30Z",
        summary:
          "state advanced (step 2); channels now set: report, sources, topic.",
        state: {
          topic: "decentralized storage on Walrus",
          sources: [
            "Walrus HTTP API — publisher/aggregator",
            "MemWal SDK — remember/recall",
            "LangGraph BaseCheckpointSaver",
          ],
          report:
            "Walrus stores agent state as immutable, content-addressed blobs. TuskPoint serializes each LangGraph checkpoint, gzips it, and PUTs it to a Walrus publisher — so an agent can survive a crash and rewind to any prior moment.",
        },
      },
    ],
  },
  {
    id: "semantic-33112",
    title: "Semantic self-search run",
    topic: "verifiable AI memory",
    manifestBlobId: "9aQ_kLp2RtVxXm8sZ1cD4fG7hJ0nB3eW6yU5iO_TbA",
    checkpoints: [
      {
        id: "1f164b8d-6dab-62f4-bfff-ac76d337a658",
        shortId: "1f164b8d…a658",
        step: -1,
        node: "__input__",
        blobId: "Aa1_bb2cc3dd4ee5ff6gg7hh8ii9jj0kk1ll2mm3nn4",
        parent: null,
        timestamp: "2026-06-10T12:02:10Z",
        summary: "the graph received its initial input.",
        state: { topic: "verifiable AI memory" },
      },
      {
        id: "1f164b8d-6dbd-6a49-8001-04bf11ec36b7",
        shortId: "1f164b8d…6cb7",
        step: 1,
        node: "researcher",
        blobId: "Bb2_cc3dd4ee5ff6gg7hh8ii9jj0kk1ll2mm3nn4oo5",
        parent: "1f164b8d-6dab-62f4-bfff-ac76d337a658",
        timestamp: "2026-06-10T12:02:44Z",
        summary: "state advanced (step 1); channels now set: sources, topic.",
        state: {
          topic: "verifiable AI memory",
          sources: ["MemWal vector recall", "Walrus blob durability"],
        },
      },
    ],
  },
];

// Pre-baked semantic search results (mirrors a real MemWal recall response).
export const SEARCH_INDEX: { text: string; distance: number }[] = [
  {
    text: "[thread=semantic-33112 checkpoint=1f164b8d…a658 step=-1] the graph received its initial input.",
    distance: 0.7839,
  },
  {
    text: "[thread=demo-thread checkpoint=1f164b8d…dd3a step=2] state advanced (step 2); channels now set: report, sources, topic.",
    distance: 0.8021,
  },
  {
    text: "[thread=demo-thread checkpoint=1f164b8d…6cb7 step=1] state advanced (step 1); channels now set: sources, topic.",
    distance: 0.8276,
  },
  {
    text: "[thread=demo-thread checkpoint=1f164b8d…9ba5 step=0] state advanced (step 0); channels now set: topic.",
    distance: 0.8435,
  },
];

export const STACK = [
  { name: "LangGraph", role: "Agent framework — we plug into its checkpoint API." },
  { name: "Walrus", role: "Decentralized blob storage — the durable source of truth." },
  { name: "MemWal", role: "Semantic memory — natural-language recall over history." },
  { name: "MCP", role: "Model Context Protocol — six tools any agent can call." },
];
