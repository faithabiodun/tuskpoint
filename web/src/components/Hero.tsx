import Link from "next/link";
import { TerminalCarousel } from "./TerminalCarousel";
import { LogoMark } from "./Logo";
import { RUN_META } from "@/lib/data";

const STATUS = [
  "walrus.certified",
  "checkpoint.saved",
  "manifest.linked",
  "recall.ready",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow + grid */}
      <div className="pointer-events-none absolute inset-0 bg-radial-flame" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:54px_54px] [mask-image:radial-gradient(70%_55%_at_50%_0%,#000,transparent)]" />

      <div className="container-page relative pb-14 pt-20 sm:pt-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* Floating mark */}
          <LogoMark
            idPrefix="hero"
            className="h-20 w-20 animate-float drop-shadow-[0_8px_30px_rgba(47,212,192,0.35)]"
          />

          <h1 className="display animate-fade-up mt-10 text-cream">
            Save agent state to a{" "}
            <span className="gradient-text">network that remembers every step.</span>{" "}
            Rewind, verify, and search any of them.
          </h1>

          <p className="animate-fade-up mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            TuskPoint is a drop-in LangGraph checkpointer. Every step is saved as
            a verifiable <span className="text-cream">Walrus</span> blob, so your
            agents survive a crash, roll back to any moment, hand a run to another
            agent, and{" "}
            <span className="text-flame">search their own history in plain English.</span>
          </p>

          {/* Terminal carousel - the centerpiece, auto + manual swipe */}
          <TerminalCarousel />

          <div className="animate-fade-up mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            <Link href="/dashboard" className="btn-primary w-full sm:w-auto">
              See a real run
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3 10a1 1 0 0 1 1-1h9.6l-3.3-3.3a1 1 0 1 1 1.4-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H4a1 1 0 0 1-1-1Z"
                />
              </svg>
            </Link>
            <Link href="/#tools" className="btn-ghost w-full sm:w-auto">
              Browse the 11 tools
            </Link>
          </div>

          {/* Status line - aeroplane motif */}
          <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[12px] text-slate-500">
            {STATUS.map((s) => (
              <span key={s} className="inline-flex items-center gap-2">
                <span className="status-dot" />
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Stat strip */}
        <div className="animate-fade-up mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {[
            { k: "11", v: "MCP tools" },
            { k: "2", v: "storage layers" },
            { k: "100%", v: "byte-exact reads" },
            { k: "0", v: "secrets on-site" },
          ].map((s) => (
            <div key={s.v} className="bg-ink-900 px-4 py-6 text-center">
              <p className="text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
                {s.k}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                {s.v}
              </p>
            </div>
          ))}
        </div>

        {/* Real-run proof line */}
        <div className="animate-fade-up mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center font-mono text-[11px] text-slate-600">
          <span>
            manifest{" "}
            <span className="text-flame">
              {RUN_META.manifestBlobId.slice(0, 12)}…
            </span>
          </span>
          <span>
            {RUN_META.checkpointCount} checkpoints · stored live on Walrus
          </span>
        </div>
      </div>
    </section>
  );
}
