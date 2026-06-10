import Link from "next/link";
import { CopyButton } from "./CopyButton";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow + grid */}
      <div className="pointer-events-none absolute inset-0 bg-radial-teal" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:48px_48px] [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)]" />

      <div className="container-page relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-ink-800/60 px-4 py-1.5 text-xs font-medium text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            Walrus track · LangGraph · MCP
          </div>

          <h1 className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Agent memory that{" "}
            <span className="gradient-text">survives a crash</span>.
          </h1>

          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            TuskPoint is a drop-in LangGraph checkpointer that stores agent state
            as immutable <strong className="text-slate-200">Walrus</strong> blobs.
            Rewind to any moment, and search your history in plain English via{" "}
            <strong className="text-slate-200">MemWal</strong> — all exposed
            through an <strong className="text-slate-200">MCP</strong> server.
          </p>

          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn-primary w-full sm:w-auto">
              Explore the live demo
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3 10a1 1 0 0 1 1-1h9.6l-3.3-3.3a1 1 0 1 1 1.4-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H4a1 1 0 0 1-1-1Z"
                />
              </svg>
            </Link>
            <Link href="/#tools" className="btn-ghost w-full sm:w-auto">
              Browse the 6 MCP tools
            </Link>
          </div>

          {/* Install line */}
          <div className="animate-fade-up mx-auto mt-10 flex max-w-md items-center justify-between gap-3 rounded-xl border border-line bg-ink-950/70 px-4 py-3">
            <code className="truncate font-mono text-sm text-slate-300">
              <span className="text-slate-600">$ </span>
              pip install -e &quot;.[all]&quot;
            </code>
            <CopyButton text={'pip install -e ".[all]"'} />
          </div>
        </div>

        {/* Stat strip */}
        <div className="animate-fade-up mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { k: "6", v: "MCP tools" },
            { k: "2", v: "storage layers" },
            { k: "100%", v: "byte-exact reads" },
            { k: "0", v: "secrets on-site" },
          ].map((s) => (
            <div key={s.v} className="card px-4 py-5 text-center">
              <p className="text-3xl font-bold text-white">{s.k}</p>
              <p className="mt-1 text-xs text-slate-500">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
