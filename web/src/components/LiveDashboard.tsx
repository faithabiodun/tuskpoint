"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "./Reveal";
import {
  api,
  ApiError,
  aggregatorFor,
  type CheckpointMeta,
  type Health,
  type SearchResult,
  type VerifyResult,
} from "@/lib/api";

// Strip the engine's "[thread=… step=N] " prefix, leaving the human sentence.
function sentence(summary: string): string {
  return summary.replace(/^\[[^\]]*\]\s*/, "").trim() || summary;
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-xs text-cream">{value}</p>
    </div>
  );
}

export function LiveDashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [threadId, setThreadId] = useState("");
  const [checkpoints, setCheckpoints] = useState<CheckpointMeta[]>([]);
  const [waking, setWaking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify state
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState("when did the writer start?");
  const [results, setResults] = useState<SearchResult["results"] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setWaking(true);
    setError(null);
    try {
      const h = await api.health();
      setHealth(h);
      const seed =
        process.env.NEXT_PUBLIC_DEMO_THREAD || h.seed_thread || "run-43312";
      setThreadId(seed);
      const list = await api.listThread(seed);
      setCheckpoints(list.checkpoints);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not reach the live engine.",
      );
    } finally {
      setWaking(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runVerify() {
    if (!threadId) return;
    setVerifying(true);
    setVerifyError(null);
    setVerify(null);
    try {
      setVerify(await api.verify(threadId));
    } catch (e) {
      setVerifyError(
        e instanceof ApiError ? e.message : "Verify failed.",
      );
    } finally {
      setVerifying(false);
    }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      const r = await api.search(q);
      setResults(r.results);
    } catch (err) {
      setSearchError(
        err instanceof ApiError ? err.message : "Search failed.",
      );
    } finally {
      setSearching(false);
    }
  }

  const aggregator = aggregatorFor(health?.network);

  return (
    <section className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">
            <span className="status-dot" />
            Live engine · not a screenshot
          </p>
          <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
            The control panel, running live.
          </h2>
          <p className="mt-5 text-slate-400">
            Every value below is fetched from the real TuskPoint engine at page
            load — actual checkpoints from a Walrus run. Click a blob to verify
            the bytes yourself, audit the whole trail, or search the run in plain
            English. Nothing here is mocked.
          </p>
        </Reveal>

        <Reveal className="mt-10 overflow-hidden rounded-2xl border border-line bg-ink-950/80 shadow-card">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-line bg-ink-900/60 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-flame/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-3 hidden truncate rounded-md border border-line bg-ink-950/70 px-3 py-1 font-mono text-[11px] text-slate-500 sm:block">
              tuskpoint.vercel.app/dashboard
            </span>
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  waking
                    ? "animate-pulse bg-flame"
                    : error
                      ? "bg-rose-400"
                      : "bg-teal"
                }`}
              />
              {waking ? "waking" : error ? "offline" : "live"}
            </span>
          </div>

          <div className="p-5 sm:p-7">
            {/* Meta strip (live) */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
              <MetaCell label="thread" value={threadId || "…"} />
              <MetaCell
                label="checkpoints"
                value={waking ? "…" : String(checkpoints.length)}
              />
              <MetaCell
                label="memwal"
                value={health ? (health.memwal ? "on" : "off") : "…"}
              />
              <MetaCell
                label="network"
                value={health ? `Walrus ${health.network}` : "…"}
              />
            </div>

            {/* Waking / error banners */}
            {waking && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-flame/20 bg-flame/5 px-4 py-3 text-sm text-flame">
                <span className="h-2 w-2 animate-pulse rounded-full bg-flame" />
                Waking the live engine… the free host can take up to a minute on
                the first request.
              </div>
            )}
            {error && !waking && (
              <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
                {error}{" "}
                <button
                  onClick={load}
                  className="ml-2 underline underline-offset-2 hover:text-rose-200"
                >
                  Retry
                </button>
              </div>
            )}

            {!waking && !error && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                {/* Checkpoint list */}
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    Checkpoints · newest first
                  </p>
                  <div className="rounded-xl border border-line bg-ink-950/60">
                    {checkpoints.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-500">
                        No checkpoints in this thread yet.
                      </p>
                    ) : (
                      checkpoints.slice(0, 6).map((c) => (
                        <div
                          key={c.checkpoint_id}
                          className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
                        >
                          <p className="min-w-0 flex-1 text-sm leading-snug text-slate-300">
                            {sentence(c.summary)}
                          </p>
                          <a
                            href={`${aggregator}${c.blob_id}`}
                            target="_blank"
                            rel="noreferrer"
                            title={c.blob_id}
                            className="shrink-0 font-mono text-[11px] text-slate-500 transition hover:text-flame"
                          >
                            {c.blob_id.slice(0, 12)}…
                          </a>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Verify */}
                  <div className="mt-4 rounded-xl border border-line bg-ink-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                        Audit the trail
                      </p>
                      <button
                        type="button"
                        onClick={runVerify}
                        disabled={verifying || !threadId}
                        className="rounded-lg border border-flame/40 bg-flame/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-flame transition hover:bg-flame/20 disabled:opacity-50"
                      >
                        {verifying ? "verifying…" : "verify_trail"}
                      </button>
                    </div>
                    {verifyError && (
                      <p className="mt-3 text-xs text-rose-300">{verifyError}</p>
                    )}
                    {verify && (
                      <p
                        className={`mt-3 font-mono text-[11px] ${
                          verify.ok ? "text-teal" : "text-rose-300"
                        }`}
                      >
                        ok={String(verify.ok)} · {verify.verified}/
                        {verify.checkpoint_count} verified ·{" "}
                        {verify.tampered_count} tampered
                      </p>
                    )}
                    {!verify && !verifyError && (
                      <p className="mt-3 text-xs text-slate-500">
                        Re-fetches every blob, recomputes its SHA-256, and
                        compares to the manifest — cryptographic, not just a
                        successful fetch.
                      </p>
                    )}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    Search the run · plain English
                  </p>
                  <form onSubmit={runSearch} className="flex gap-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ask anything about this run…"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-ink-950/60 px-3 py-2 font-mono text-xs text-cream outline-none transition placeholder:text-slate-600 focus:border-flame/40"
                    />
                    <button
                      type="submit"
                      disabled={searching}
                      className="shrink-0 rounded-lg border border-flame/40 bg-flame/10 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-flame transition hover:bg-flame/20 disabled:opacity-50"
                    >
                      {searching ? "…" : "search"}
                    </button>
                  </form>

                  <div className="mt-4 min-h-[120px] rounded-xl border border-line bg-ink-950/60 p-4">
                    {searchError && (
                      <p className="text-xs text-rose-300">{searchError}</p>
                    )}
                    {!searchError && results === null && (
                      <p className="text-xs text-slate-500">
                        MemWal returns the nearest checkpoint summaries with a
                        distance score — pointers you can then load exactly.
                      </p>
                    )}
                    {!searchError && results?.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No matches for that query.
                      </p>
                    )}
                    {!searchError && results && results.length > 0 && (
                      <div className="space-y-2">
                        {results.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-3 border-b border-line py-2 last:border-b-0"
                          >
                            <span className="min-w-0 flex-1 text-xs leading-snug text-slate-300">
                              {sentence(r.text)}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-flame">
                              {r.distance.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link href="/dashboard" className="btn-primary">
            Open the full dashboard
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a1 1 0 0 1 1-1h9.6l-3.3-3.3a1 1 0 1 1 1.4-1.4l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H4a1 1 0 0 1-1-1Z"
              />
            </svg>
          </Link>
          <span className="font-mono text-[11px] text-slate-500">
            diff, save, fork, roll back &amp; hand off — all live on the full
            dashboard
          </span>
        </Reveal>
      </div>
    </section>
  );
}
