"use client";

import { useState } from "react";
import { SEARCH_INDEX } from "@/lib/data";

const SUGGESTIONS = [
  "when did the writer start?",
  "what sources were gathered?",
  "the initial input to the graph",
  "final report state",
];

type Result = { text: string; distance: number };

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  function run(q: string) {
    const term = q.trim();
    if (!term) return;
    setQuery(term);
    setLoading(true);
    setResults(null);
    // Simulate the round-trip to MemWal. Re-rank the baked index by a light
    // keyword overlap so the demo feels responsive to the query.
    setTimeout(() => {
      const words = term.toLowerCase().split(/\s+/).filter(Boolean);
      const ranked = SEARCH_INDEX.map((r) => {
        const hay = r.text.toLowerCase();
        const hits = words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);
        // lower distance = closer; nudge closer for keyword hits
        return { ...r, distance: Math.max(0.05, r.distance - hits * 0.06) };
      }).sort((a, b) => a.distance - b.distance);
      setResults(ranked);
      setLoading(false);
    }, 550);
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-white">
        Semantic search over history
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Mirrors <code className="text-slate-400">checkpoint_search</code> →
        MemWal recall. Lower distance = closer match. Results are pointers you
        then load <em>exactly</em>.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="mt-5 flex gap-2"
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
            className="w-full rounded-xl border border-line bg-ink-800/70 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-teal/50 focus:ring-2 focus:ring-teal/20"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {/* Suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            className="rounded-full border border-line bg-ink-700/40 px-3 py-1 text-xs text-slate-400 transition hover:border-teal/30 hover:text-teal"
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

        {results && !loading && (
          <ol className="space-y-2">
            {results.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-line bg-ink-950/60 px-4 py-3"
              >
                <span
                  className="mt-0.5 shrink-0 rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal"
                  title="vector distance"
                >
                  {r.distance.toFixed(3)}
                </span>
                <span className="font-mono text-xs leading-relaxed text-slate-300">
                  {r.text}
                </span>
              </li>
            ))}
          </ol>
        )}

        {!results && !loading && (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-slate-500">
            Run a search to see ranked checkpoint summaries.
          </p>
        )}
      </div>
    </div>
  );
}
