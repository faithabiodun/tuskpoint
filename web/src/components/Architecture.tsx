import { STACK } from "@/lib/data";
import { Reveal } from "./Reveal";

const FLOW = [
  {
    step: "01",
    label: "Intercept",
    title: "Agent takes a step",
    body: "Your LangGraph agent advances. WalrusSaver.put() intercepts the new checkpoint — no agent code changes required.",
  },
  {
    step: "02",
    label: "Persist",
    title: "Serialize → gzip → Walrus",
    body: "State is serialized with LangGraph's serde, gzipped, and PUT to a Walrus publisher. You get back an immutable blob ID.",
  },
  {
    step: "03",
    label: "Index",
    title: "Summarize → MemWal",
    body: "A one-line natural-language summary is written to MemWal so the run becomes semantically searchable.",
  },
  {
    step: "04",
    label: "Recover",
    title: "Resume or rewind",
    body: "Know the ID? Load it exactly from Walrus. Only a vague memory? Search MemWal in English → get the ID → load exactly.",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
            Two layers, one source of truth.
          </h2>
          <p className="mt-5 text-slate-400">
            Exact for trust. Semantic for discovery. Walrus for durability.
            Vector recall is only ever an index <em>into</em> the exact store —
            never the source of truth.
          </p>
        </Reveal>

        {/* Flow steps — numbered editorial rows */}
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {FLOW.map((f, i) => (
            <Reveal
              key={f.step}
              delay={i * 70}
              className="bg-ink-900 p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-3xl font-bold text-flame">
                  {f.step}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {f.label}
                </span>
              </div>
              <h3 className="mt-5 font-bold text-cream">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.body}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Data-flow diagram */}
        <Reveal className="mt-8 overflow-hidden rounded-2xl border border-line bg-ink-950/80">
          <div className="flex items-center gap-2 border-b border-line bg-ink-900/60 px-4 py-2.5">
            <span className="status-dot" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              data flow
            </span>
          </div>

          <div className="px-5 py-8 sm:px-8 sm:py-10">
            {/* Source node */}
            <div className="flex justify-center">
              <FlowNode tone="slate" kicker="source" title="LangGraph agent">
                advances one step
              </FlowNode>
            </div>

            {/* connector down into the interceptor */}
            <Connector />

            <div className="flex justify-center">
              <FlowNode tone="flame" kicker="intercept" title="WalrusSaver.put()" mono>
                no agent code changes
              </FlowNode>
            </div>

            {/* split into two parallel lanes */}
            <div className="relative mx-auto mt-2 h-8 w-px bg-line sm:h-10">
              <span className="absolute left-1/2 top-full hidden h-px w-[min(38rem,70vw)] -translate-x-1/2 bg-line sm:block" />
            </div>

            <div className="mt-0 grid gap-8 sm:mt-8 sm:grid-cols-2 sm:gap-6">
              {/* Exact lane */}
              <div className="flex flex-col items-center">
                <LaneLabel>serialize · gzip · PUT</LaneLabel>
                <Connector short />
                <FlowNode
                  tone="teal"
                  kicker="the truth"
                  title="Walrus blob"
                  className="w-full"
                >
                  immutable, content-addressed
                </FlowNode>
                <ReadHint>← exact reads by blob id</ReadHint>
              </div>

              {/* Semantic lane */}
              <div className="flex flex-col items-center">
                <LaneLabel>build 1-line summary</LaneLabel>
                <Connector short />
                <FlowNode
                  tone="flame"
                  kicker="the index"
                  title="MemWal"
                  className="w-full"
                >
                  semantic recall layer
                </FlowNode>
                <ReadHint>← search in English → returns ids</ReadHint>
              </div>
            </div>

            {/* footnote */}
            <p className="mt-9 text-center font-mono text-[11px] leading-relaxed text-slate-600">
              manifest blob id cached locally in{" "}
              <span className="text-slate-400">.walrus_threads.json</span>
            </p>
          </div>
        </Reveal>

        {/* Stack */}
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((s, i) => (
            <Reveal key={s.name} delay={i * 60} className="bg-ink-900 p-6">
              <h3 className="font-mono text-sm font-bold text-flame">{s.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.role}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Data-flow diagram primitives ───────────────────────────────────── */

type Tone = "slate" | "flame" | "teal";

const TONE: Record<Tone, { ring: string; kicker: string; dot: string }> = {
  slate: {
    ring: "border-line bg-ink-900/80",
    kicker: "text-slate-500",
    dot: "bg-slate-500",
  },
  flame: {
    ring: "border-flame/30 bg-flame/[0.06]",
    kicker: "text-flame",
    dot: "bg-flame",
  },
  teal: {
    ring: "border-teal/30 bg-teal/[0.06]",
    kicker: "text-teal",
    dot: "bg-teal",
  },
};

function FlowNode({
  tone,
  kicker,
  title,
  mono,
  className = "",
  children,
}: {
  tone: Tone;
  kicker: string;
  title: string;
  mono?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`max-w-xs rounded-xl border px-5 py-4 text-center shadow-card ${t.ring} ${className}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${t.kicker}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
        {kicker}
      </span>
      <p
        className={`mt-2 font-bold text-cream ${mono ? "font-mono text-sm" : "text-base"}`}
      >
        {title}
      </p>
      {children ? (
        <p className="mt-1 text-xs text-slate-400">{children}</p>
      ) : null}
    </div>
  );
}

function Connector({ short }: { short?: boolean }) {
  return (
    <div
      className={`mx-auto w-px bg-line ${short ? "h-6" : "h-8 sm:h-10"}`}
      aria-hidden
    />
  );
}

function LaneLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
      {children}
    </span>
  );
}

function ReadHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 font-mono text-[11px] text-slate-500">{children}</p>
  );
}
