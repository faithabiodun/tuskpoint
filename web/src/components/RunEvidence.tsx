import Link from "next/link";
import { Reveal } from "./Reveal";
import { THREAD, EVIDENCE_AGGREGATOR } from "@/lib/data";

const NODE_TINT: Record<string, string> = {
  __input__: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  researcher: "text-flame border-flame/30 bg-flame/10",
  writer: "text-flame-soft border-accent/30 bg-accent/10",
};

export function RunEvidence() {
  const cps = THREAD.checkpoints;

  return (
    <section className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Real run · not a mockup</p>
          <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
            Every step, an immutable receipt.
          </h2>
          <p className="mt-5 text-slate-400">
            These are real checkpoints from one researcher&nbsp;→&nbsp;writer run.
            Each blob ID below resolves to the exact bytes that were written,
            click any to verify on the public aggregator.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            This run, and the live dashboard, run on the Walrus testnet (free
            writes), so blob links resolve on the testnet aggregator. The same
            engine runs unchanged on mainnet, point{" "}
            <code className="text-slate-400">WALRUS_PUBLISHER_URL</code> /{" "}
            <code className="text-slate-400">WALRUS_AGGREGATOR_URL</code> at
            mainnet for paid, production writes.
          </p>
        </Reveal>

        {/* Manifest line */}
        <Reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-ink-900/60 px-4 py-3 font-mono text-xs">
          <span className="text-slate-500">manifest</span>
          <span className="truncate text-flame">{THREAD.manifestBlobId}</span>
          <span className="text-slate-500">thread</span>
          <span className="text-cream">{THREAD.id}</span>
        </Reveal>

        {/* Packet cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cps.map((c, i) => (
            <Reveal
              key={c.id}
              as="article"
              delay={i * 60}
              className="group flex flex-col rounded-2xl border border-line bg-ink-900/50 p-5 transition hover:border-flame/30"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                    NODE_TINT[c.node] ?? NODE_TINT.__input__
                  }`}
                >
                  {c.node}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  step {c.step}
                </span>
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">
                {c.summary}
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                  blob
                </span>
                <a
                  href={`${EVIDENCE_AGGREGATOR}${c.blobId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto truncate font-mono text-[11px] text-slate-500 transition hover:text-flame"
                  title={c.blobId}
                >
                  {c.blobId.slice(0, 18)}…
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8">
          <Link href="/dashboard" className="btn-ghost">
            Inspect, diff &amp; search this run
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a1 1 0 0 1 1-1h9.6l-3.3-3.3a1 1 0 1 1 1.4-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H4a1 1 0 0 1-1-1Z"
              />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
