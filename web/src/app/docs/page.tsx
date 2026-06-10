import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { TOOLS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Docs — TuskPoint",
  description:
    "How TuskPoint works: quick start, the six MCP tools, MCP client registration, and the exact-vs-semantic design.",
};

const mcpJson = `{
  "mcpServers": {
    "tuskpoint-checkpoints": {
      "command": "python",
      "args": ["mcp_server/server.py"],
      "cwd": ".",
      "env": {
        "WALRUS_PUBLISHER_URL": "https://publisher.walrus-testnet.walrus.space",
        "WALRUS_AGGREGATOR_URL": "https://aggregator.walrus-testnet.walrus.space"
      }
    }
  }
}`;

const SECTIONS = [
  { id: "start", label: "Quick start" },
  { id: "tools", label: "The six tools" },
  { id: "mcp", label: "Register MCP" },
  { id: "design", label: "Design" },
];

export default function DocsPage() {
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[200px_1fr]">
      {/* Side nav */}
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1">
          <p className="mb-2 px-3 text-xs uppercase tracking-wider text-slate-500">
            On this page
          </p>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-ink-700/50 hover:text-cream"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="max-w-3xl">
        <p className="eyebrow">Documentation</p>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-cream sm:text-5xl">
          Get started with TuskPoint
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          A drop-in LangGraph checkpointer that stores agent state on Walrus,
          with semantic recall via MemWal and an MCP server. Below is everything
          you need to run it.
        </p>

        {/* Quick start */}
        <section id="start" className="mt-12 scroll-mt-24">
          <h2 className="text-2xl font-bold text-cream">Quick start</h2>
          <p className="mt-3 text-slate-400">
            Install the package and copy the env template. All secrets come from
            environment variables — nothing is hard-coded.
          </p>
          <div className="mt-4 space-y-3">
            <CodeBlock
              label="install"
              code={'python -m pip install -e ".[all]"\ncp .env.example .env   # then fill in your keys'}
            />
            <CodeBlock
              label="prove walrus round-trip"
              code={"python scripts/check_walrus.py"}
            />
            <CodeBlock
              label="crash / resume demo"
              code={
                "python demo/run_demo.py --real --part1   # run, persist, EXIT\npython demo/run_demo.py --real --part2   # fresh process resumes from Walrus"
              }
            />
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-bold text-cream">The six tools</h2>
          <p className="mt-3 text-slate-400">
            Exposed over stdio by{" "}
            <code className="text-slate-300">mcp_server/server.py</code>.
          </p>
          <div className="mt-5 space-y-3">
            {TOOLS.map((t) => (
              <div key={t.name} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal">
                    {t.glyph}
                  </span>
                  <code className="font-mono text-sm font-semibold text-cream">
                    {t.signature}
                  </code>
                </div>
                <p className="mt-2 text-sm text-slate-400">{t.summary}</p>
                <p className="mt-2 font-mono text-xs text-slate-500">
                  → {t.returns}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* MCP registration */}
        <section id="mcp" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-bold text-cream">Register with a client</h2>
          <p className="mt-3 text-slate-400">
            A ready-to-use <code className="text-slate-300">.mcp.json</code> ships
            in the repo. For Claude Desktop, add the equivalent to{" "}
            <code className="text-slate-300">claude_desktop_config.json</code>:
          </p>
          <div className="mt-4">
            <CodeBlock label=".mcp.json" lang="json" code={mcpJson} />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            <code className="text-slate-400">checkpoint_search</code> returns an
            explanatory message instead of failing when no MemWal credentials are
            present, so the server runs fine without them.
          </p>
        </section>

        {/* Design */}
        <section id="design" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-bold text-cream">
            Exact vs. semantic — why both?
          </h2>
          <div className="mt-4 space-y-4 text-slate-400">
            <p>
              <strong className="text-slate-200">Exact lookups are by ID,
              never fuzzy.</strong>{" "}
              <code className="text-slate-300">checkpoint_load</code> resolves the
              manifest entry → blob ID → Walrus GET → de-gzip → de-serialize.
              The blob you read is byte-for-byte the blob you wrote. This is the
              part you rewind to.
            </p>
            <p>
              <strong className="text-slate-200">Semantic search is for
              discovery.</strong>{" "}
              <code className="text-slate-300">checkpoint_search</code> asks
              MemWal for the nearest summaries — pointers that carry checkpoint
              IDs, which you then load exactly. Vector recall is an index into the
              exact store, never the source of truth.
            </p>
            <div className="card border-teal/20 bg-teal/5 p-5">
              <p className="text-sm text-slate-300">
                <strong className="text-teal">Not a MemWal MCP clone.</strong>{" "}
                MemWal ships an MCP for free-form memories. TuskPoint manages
                durable, exactly-addressable checkpoints you can resume a graph
                from. The only overlap, search, is scoped to <em>our</em>{" "}
                checkpoint summaries.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-14 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link href="/dashboard" className="btn-primary">
            Try the dashboard
          </Link>
          <Link href="/#tools" className="btn-ghost">
            Back to tools
          </Link>
        </div>
      </article>
    </div>
  );
}
