import { STACK } from "@/lib/data";

const FLOW = [
  {
    step: "1",
    title: "Agent takes a step",
    body: "Your LangGraph agent advances. WalrusSaver.put() intercepts the new checkpoint — no agent code changes required.",
    tint: "from-teal/20 to-transparent",
  },
  {
    step: "2",
    title: "Serialize → gzip → Walrus",
    body: "State is serialized with LangGraph's serde, gzipped, and PUT to a Walrus publisher. You get back an immutable blob ID. (the exact layer)",
    tint: "from-sky-400/20 to-transparent",
  },
  {
    step: "3",
    title: "Summarize → MemWal",
    body: "A one-line natural-language summary is written to MemWal so the run becomes semantically searchable. (the discovery layer)",
    tint: "from-accent/20 to-transparent",
  },
  {
    step: "4",
    title: "Resume or rewind",
    body: "Know the ID? Load it exactly from Walrus. Only a vague memory? Search MemWal in English → get the ID → load exactly.",
    tint: "from-teal/20 to-transparent",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="container-page py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="pill mx-auto">How it works</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Two layers, one source of truth
        </h2>
        <p className="mt-4 text-slate-400">
          Exact for trust. Semantic for discovery. Walrus for durability. Vector
          recall is only ever an index <em>into</em> the exact store — never the
          source of truth.
        </p>
      </div>

      {/* Flow steps */}
      <div className="mt-14 grid gap-4 lg:grid-cols-4">
        {FLOW.map((f) => (
          <div key={f.step} className="card relative overflow-hidden p-6">
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.tint}`}
            />
            <div className="relative">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-950/60 font-mono text-sm font-bold text-teal">
                {f.step}
              </span>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ASCII-style diagram */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-ink-950/80">
        <div className="border-b border-line bg-ink-800/60 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
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
      </div>

      {/* Stack */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STACK.map((s) => (
          <div key={s.name} className="card p-5">
            <h3 className="font-semibold text-white">{s.name}</h3>
            <p className="mt-1.5 text-sm text-slate-400">{s.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
