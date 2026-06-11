import type { Metadata } from "next";
import { DocTitle, H2, P } from "../ui";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "What ships today and what's next: cross-agent hand-off, branch UI, and richer audit.",
};

type Item = { title: string; body: string };

const SHIPPED: Item[] = [
  {
    title: "Walrus-backed checkpointer",
    body: "Drop-in LangGraph saver. Every step is a gzipped, content-addressed Walrus blob with a per-thread manifest.",
  },
  {
    title: "Crash & resume",
    body: "A fresh process rehydrates the latest checkpoint and continues exactly where the last one stopped.",
  },
  {
    title: "Semantic recall (MemWal)",
    body: "Each checkpoint carries a one-line summary, recallable in plain English — pointers you then load exactly.",
  },
  {
    title: "Fork & replay",
    body: "Branch any checkpoint into a new thread to explore a different path. Git for agent runs.",
  },
  {
    title: "Audit trail",
    body: "verify_trail walks a thread's blob chain and re-fetches every blob to prove the run is intact and untampered.",
  },
  {
    title: "All-in-one MCP server",
    body: "Eight tools over stdio plus tuskpoint_info, with copy-paste setup for Claude, Cursor, and Windsurf.",
  },
  {
    title: "Walrus mainnet",
    body: "Reads default to mainnet aggregators; writes via a configurable publisher.",
  },
];

const NEXT: Item[] = [
  {
    title: "Cross-agent hand-off",
    body: "First-class primitives for one agent to verify another's trail and resume from it — multi-agent coordination over shared, durable memory.",
  },
  {
    title: "Branch & merge UI",
    body: "Visualize the fork tree in the dashboard: compare branches side by side and promote a winning path.",
  },
  {
    title: "Richer audit",
    body: "Signed trails and exportable verification reports for compliance-grade provenance.",
  },
  {
    title: "Artifact store",
    body: "Attach generated files (reports, datasets, images) to a checkpoint as their own blobs, reusable across runs and agents.",
  },
  {
    title: "Memory inspector",
    body: "Dev tooling to browse, diff, and prune agent memory on Walrus directly from the CLI and web.",
  },
];

function Cards({ items, done }: { items: Item[]; done: boolean }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.title} className="card p-5">
          <div className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-teal/15 text-teal"
                  : "border border-line text-slate-500"
              }`}
            >
              {done ? "✓" : "→"}
            </span>
            <div>
              <p className="font-semibold text-cream">{it.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {it.body}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <>
      <DocTitle
        eyebrow="Project"
        title="Roadmap"
        intro={
          <>
            TuskPoint is built for long-running and multi-agent workflows:
            tracking state over time, coordinating across agents, and storing
            artifacts that survive any single run. Here is what ships today and
            what comes next.
          </>
        }
      />

      <H2 id="shipped">Shipped</H2>
      <P>Everything below is live in the engine and the MCP server today.</P>
      <Cards items={SHIPPED} done />

      <H2 id="next">Next</H2>
      <P>
        Directions that extend the same foundation toward richer multi-agent and
        artifact-driven workflows.
      </P>
      <Cards items={NEXT} done={false} />
    </>
  );
}
