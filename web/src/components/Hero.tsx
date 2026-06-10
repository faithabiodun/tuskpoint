import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { RUN_META } from "@/lib/data";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow + grid */}
      <div className="pointer-events-none absolute inset-0 bg-radial-teal" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:54px_54px] [mask-image:radial-gradient(70%_55%_at_50%_0%,#000,transparent)]" />

      <div className="container-page relative pb-10 pt-16 sm:pt-20">
        {/* Centered editorial hero */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="eyebrow animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            Checkpointer · Walrus · MCP
          </p>

          <h1 className="display animate-fade-up mt-6 text-cream">
            Your agent{" "}
            <span className="gradient-text">crashed</span>
            <br />
            mid-task?
          </h1>

          <p className="animate-fade-up mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            <span className="font-semibold text-cream">Don&apos;t panic.</span>{" "}
            TuskPoint saved every step as an immutable{" "}
            <span className="text-cream">Walrus</span> blob. Resume from exactly
            where it stopped —{" "}
            <span className="text-teal">not from the beginning.</span>
          </p>

          <div className="animate-fade-up mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
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
              Browse the 6 tools
            </Link>
          </div>

          {/* Install line */}
          <div className="animate-fade-up mt-8 flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-ink-950/70 px-4 py-3">
            <code className="truncate font-mono text-sm text-slate-300">
              <span className="text-slate-600">$ </span>
              pip install -e &quot;.[all]&quot;
            </code>
            <CopyButton text={'pip install -e ".[all]"'} />
          </div>

          {/* Real-run proof chips */}
          <div className="animate-fade-up mt-6 grid w-full max-w-md grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
            <div className="bg-ink-900 px-4 py-3 text-left">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                blob id
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-teal">
                {RUN_META.manifestBlobId.slice(0, 10)}…
              </p>
            </div>
            <div className="bg-ink-900 px-4 py-3 text-left">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                checkpoints
              </p>
              <p className="mt-0.5 font-mono text-xs text-cream">
                {RUN_META.checkpointCount} · on Walrus
              </p>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="animate-fade-up mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
          {[
            { k: "6", v: "MCP tools" },
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
      </div>
    </section>
  );
}
