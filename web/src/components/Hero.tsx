import Link from "next/link";
import { CopyButton } from "./CopyButton";
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

          <p className="animate-fade-up mt-6 eyebrow">
            <span className="status-dot" />
            LangGraph checkpoints · on Walrus
          </p>

          <h1 className="display animate-fade-up mt-6 text-cream">
            Save agent state to a{" "}
            <span className="gradient-text">network that remembers.</span>
          </h1>

          <p className="animate-fade-up mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            TuskPoint is a drop-in LangGraph checkpointer. Every step becomes an
            immutable <span className="text-cream">Walrus</span> blob — so you can
            survive a crash, rewind to any moment, and{" "}
            <span className="text-flame">search your run in plain English.</span>
          </p>

          {/* Terminal install — the centerpiece */}
          <div className="animate-fade-up mt-9 w-full max-w-xl">
            <div className="overflow-hidden rounded-2xl border border-line bg-ink-950/80 shadow-card backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-flame/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  install
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <code className="truncate font-mono text-sm text-slate-200 sm:text-[15px]">
                  <span className="text-flame">$ </span>
                  pip install -e &quot;.[all]&quot;
                </code>
                <CopyButton text={'pip install -e ".[all]"'} />
              </div>
            </div>
          </div>

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
              Browse the 8 tools
            </Link>
          </div>

          {/* Status line — aeroplane motif */}
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
            { k: "8", v: "MCP tools" },
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
