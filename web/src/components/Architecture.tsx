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

        {/* ASCII-style diagram */}
        <Reveal className="mt-8 overflow-hidden rounded-2xl border border-line bg-ink-950/80">
          <div className="border-b border-line bg-ink-900/60 px-4 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              data flow
            </span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 text-[13px] leading-relaxed text-slate-400">
{`   LangGraph agent ──▶ WalrusSaver.put()
                          │
        ┌─────────────────┼──────────────────┐
        ▼                                     ▼
  serialize+gzip+PUT                   build 1-line summary
        │                                     │
        ▼                                     ▼
  ┌──────────────┐                     ┌──────────────┐
  │ Walrus blob  │  ◀── exact reads    │   MemWal     │  ◀── English search
  │ (the truth)  │      by blob id     │ (the index)  │      → returns ids
  └──────────────┘                     └──────────────┘
        ▲
        └── manifest blob id cached locally in .walrus_threads.json`}
          </pre>
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
