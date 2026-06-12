"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Result = { text: string; distance: number };

const SUGGESTIONS = [
  "when did the writer start?",
  "what sources were gathered?",
  "the final report",
];

export function SearchPanel() {
  const [query, setQuery] = useState(SUGGESTIONS[0]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState<string | null>(null);

  async function run(q: string) {
    const term = q.trim();
    if (!term) return;
    setQuery(term);
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.search(term);
      setResults(res.results);
      setRan(term);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Search failed against the engine.",
      );
    } finally {
      setLoading(false);
    }
  }

  // Run the default query once on mount so the panel opens with live results.
  useEffect(() => {
    run(SUGGESTIONS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-line bg-ink-900/50 p-6">
      <h2 className="text-sm font-semibold text-cream">
        Semantic search over history
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Live <code className="text-slate-400">checkpoint_search</code> → MemWal
        recall over real checkpoint summaries. Lower distance = closer match.
        Results are pointers you then load <em>exactly</em>.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="mt-5 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.4 9.8l3.4 3.4a1 1 0 0 0 1.4-1.4l-3.4-3.4A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask in plain English…"
            className="w-full rounded-full border border-line bg-ink-800/70 py-2.5 pl-10 pr-4 text-sm text-cream placeholder:text-slate-500 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            className="rounded-full border border-line bg-ink-800/40 px-3 py-1 text-xs text-slate-400 transition hover:border-flame/30 hover:text-flame"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl border border-line bg-ink-800/40"
              />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {results && !loading && !error && (
          <>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              {results.length > 0
                ? `Live MemWal recall for “${ran}”.`
                : `No matches for “${ran}”.`}
            </p>
            <ol className="space-y-2">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-line bg-ink-950/60 px-4 py-3"
                >
                  <span
                    className="mt-0.5 shrink-0 rounded-md border border-flame/30 bg-flame/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-flame"
                    title="vector distance"
                  >
                    {r.distance.toFixed(3)}
                  </span>
                  <span className="text-xs leading-relaxed text-slate-300">
                    {r.text}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
