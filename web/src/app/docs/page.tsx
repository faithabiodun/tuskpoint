import type { Metadata } from "next";
import Link from "next/link";
import { DocTitle, H2, P, Callout, Code } from "./ui";

export const metadata: Metadata = {
  title: "Overview",
  description:
    "What TuskPoint is, the problem it solves, and how its pieces fit together.",
};

const CARDS = [
  {
    href: "/docs/quickstart",
    title: "Quick start",
    body: "Install, prove a Walrus round-trip, and run the crash/resume demo.",
  },
  {
    href: "/docs/tools",
    title: "The eight tools",
    body: "Save, load, list, resume, diff, search, fork, and verify_trail.",
  },
  {
    href: "/docs/clients",
    title: "Connect a client",
    body: "Copy-paste config for Claude Desktop, Claude Code, Cursor, Windsurf.",
  },
  {
    href: "/docs/fork",
    title: "Fork & replay",
    body: "Branch any checkpoint into a new thread — git for agent runs.",
  },
];

export default function DocsOverviewPage() {
  return (
    <>
      <DocTitle
        eyebrow="Documentation"
        title="What is TuskPoint?"
        intro={
          <>
            TuskPoint is a drop-in{" "}
            <span className="text-cream">LangGraph checkpointer</span> that
            stores every step of an agent run as an immutable{" "}
            <span className="text-cream">Walrus</span> blob. When a process
            crashes, you resume from exactly where it stopped — not from the
            beginning — and you can fork, diff, search, and audit the entire
            history.
          </>
        }
      />

      <H2>The problem</H2>
      <P>
        Long-running and multi-agent workflows accumulate state: research notes,
        intermediate artifacts, tool outputs, decisions. When the process dies —
        a timeout, an OOM, a redeploy — that state usually dies with it, and the
        agent restarts from zero. Keeping it in a local file or a single
        database row makes it fragile and hard to inspect.
      </P>
      <P>
        TuskPoint persists each checkpoint to Walrus, a decentralized blob store
        where every blob is content-addressed. A read returns the exact bytes
        you wrote, verifiably, from any aggregator — no central server to trust
        and nothing to lose on a crash.
      </P>

      <H2>How the pieces fit</H2>
      <P>
        Three layers, one drop-in saver. LangGraph calls the standard checkpoint
        API; TuskPoint serializes and gzips the state, stores it on Walrus, and
        records the blob in a per-thread manifest. MemWal adds a one-line
        natural-language summary so you can recall checkpoints in plain English.
        An MCP server exposes the whole thing as eight tools any agent can call.
      </P>

      <ul className="mt-4 space-y-2 text-slate-400">
        <li>
          <span className="font-semibold text-cream">WalrusSaver</span> — the
          exact, byte-for-byte layer. The source of truth you rewind to.
        </li>
        <li>
          <span className="font-semibold text-cream">MemWal</span> — the
          semantic index. Pointers into the exact store, never the truth itself.
        </li>
        <li>
          <span className="font-semibold text-cream">MCP server</span> — the
          all-in-one toolbelt: <Code>checkpoint_save</Code>,{" "}
          <Code>checkpoint_fork</Code>, <Code>verify_trail</Code>, and more.
        </li>
      </ul>

      <Callout title="Exact vs. semantic — both, on purpose">
        Lookups by ID are deterministic and content-addressed. Semantic search
        is only for discovery: it returns summaries carrying checkpoint IDs you
        then load exactly. Vector recall indexes the exact store; it is never the
        source of truth.
      </Callout>

      <H2>Keep reading</H2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group card p-5 transition hover:border-flame/40"
          >
            <p className="font-semibold text-cream group-hover:text-flame">
              {c.title}
            </p>
            <p className="mt-1.5 text-sm text-slate-400">{c.body}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
