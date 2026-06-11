import { Reveal } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Wrap your graph",
    body: "Pass WalrusSaver to compile() like any LangGraph checkpointer. No new APIs to learn — your nodes don't change.",
    code: "graph.compile(checkpointer=WalrusSaver())",
  },
  {
    n: "02",
    title: "Every step is stored",
    body: "Each checkpoint is gzipped and written as an immutable Walrus blob, linked into a thread manifest with its parent and a summary.",
    code: "checkpoint → walrus.blob → manifest",
  },
  {
    n: "03",
    title: "Rewind, fork, recall",
    body: "Resume after a crash, fork any checkpoint into a new branch, or ask your run a question in plain English via MemWal.",
    code: 'saver.search_history("when did the writer start?")',
  },
];

export function Steps() {
  return (
    <section className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="mb-12 max-w-2xl">
          <p className="eyebrow">
            <span className="status-dot" />
            How it works
          </p>
          <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
            Three lines from crash-prone to durable.
          </h2>
          <p className="mt-5 text-slate-400">
            TuskPoint slots into an existing LangGraph app and turns every step
            into verifiable, on-network state.
          </p>
        </Reveal>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {STEPS.map((s) => (
            <Reveal key={s.n} className="flex flex-col bg-ink-900 p-7">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-flame/80">
                {s.n}
              </span>
              <h3 className="mt-5 text-lg font-bold text-cream">{s.title}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-400">
                {s.body}
              </p>
              <code className="mt-5 block overflow-x-auto rounded-lg border border-line bg-ink-950/70 px-3 py-2.5 font-mono text-[12px] text-slate-300">
                {s.code}
              </code>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
