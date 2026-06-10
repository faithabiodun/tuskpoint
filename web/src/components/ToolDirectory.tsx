"use client";

import { useMemo, useState } from "react";
import { TOOLS, type Tool } from "@/lib/data";

const CATEGORIES = ["All", "Write", "Read", "Discover"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<Tool["category"], string> = {
  Write: "text-teal border-teal/30 bg-teal/10",
  Read: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  Discover: "text-accent-soft border-accent/30 bg-accent/10",
};

export function ToolDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      const matchesCat = category === "All" || t.category === category;
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.signature.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, category]);

  return (
    <div>
      {/* Search + filter bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
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
            placeholder="Search the six checkpoint tools…"
            className="w-full rounded-full border border-line bg-ink-900/70 py-2.5 pl-10 pr-4 text-sm text-cream placeholder:text-slate-500 outline-none transition focus:border-teal/50 focus:ring-2 focus:ring-teal/20"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition ${
                category === c
                  ? "border-teal/50 bg-teal/15 text-teal"
                  : "border-line bg-ink-900/50 text-slate-400 hover:text-cream"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tool) => (
          <article
            key={tool.name}
            className="group flex flex-col bg-ink-900 p-6 transition hover:bg-ink-800"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="inline-flex h-9 items-center rounded-lg border border-line bg-ink-950/60 px-2.5 font-mono text-xs font-bold text-teal">
                {tool.glyph}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_STYLES[tool.category]}`}
              >
                {tool.category}
              </span>
            </div>

            <h3 className="font-mono text-sm font-bold text-cream">
              {tool.name}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              {tool.summary}
            </p>

            <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-slate-500">
              <span className="text-slate-600">→ </span>
              {tool.returns}
            </p>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-500">
          No tools match &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
