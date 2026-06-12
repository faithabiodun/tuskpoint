"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type DiffResult } from "@/lib/api";
import type { TimelineItem } from "./Timeline";

type DiffRow =
  | { kind: "added"; key: string; b: unknown }
  | { kind: "removed"; key: string; a: unknown }
  | { kind: "changed"; key: string; a: unknown; b: unknown };

function fmt(v: unknown) {
  return JSON.stringify(v);
}

// Flatten the engine's diff payload into ordered rows for display.
function toRows(d: DiffResult): DiffRow[] {
  const rows: DiffRow[] = [];
  for (const [key, b] of Object.entries(d.added)) rows.push({ kind: "added", key, b });
  for (const [key, a] of Object.entries(d.removed)) rows.push({ kind: "removed", key, a });
  for (const [key, ch] of Object.entries(d.changed))
    rows.push({ kind: "changed", key, a: ch.from, b: ch.to });
  return rows.sort((x, y) => x.key.localeCompare(y.key));
}

const KIND_META = {
  added: { sign: "+", cls: "text-flame", bg: "bg-flame/5 border-flame/20" },
  removed: { sign: "−", cls: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/20" },
  changed: { sign: "~", cls: "text-amber-300", bg: "bg-amber-400/5 border-amber-400/20" },
} as const;

export function DiffPanel({
  threadId,
  items,
}: {
  threadId: string;
  items: TimelineItem[];
}) {
  // Timeline is newest-first; default A=oldest, B=newest so the diff shows
  // the run's net change.
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length < 2) return;
    // Default A to the oldest checkpoint that carries real state (skip the
    // __input__ genesis node, whose state is empty) and B to the newest, so the
    // opening diff shows the run's meaningful net change.
    const withState = items.filter((i) => i.node !== "__input__");
    const oldest = (withState.length ? withState : items)[
      (withState.length ? withState : items).length - 1
    ];
    setAId((prev) => prev || oldest.id);
    setBId((prev) => prev || items[0].id);
  }, [items]);

  useEffect(() => {
    if (!threadId || !aId || !bId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDiff(null);
    api
      .diff(threadId, aId, bId)
      .then((res) => {
        if (!cancelled) setDiff(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to diff checkpoints.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, aId, bId]);

  if (items.length < 2) {
    return (
      <div className="card p-6">
        <p className="rounded-xl border border-line bg-ink-950/60 px-4 py-6 text-center text-sm text-slate-500">
          Need at least two checkpoints to diff.
        </p>
      </div>
    );
  }

  const rows = diff ? toRows(diff) : [];

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-cream">Compare checkpoints</h2>
      <p className="mt-1 text-xs text-slate-500">
        Live <code className="text-slate-400">checkpoint_diff</code> over the
        engine: added, removed, and changed keys between two real Walrus blobs.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          ["Baseline (A)", aId, setAId] as const,
          ["Comparison (B)", bId, setBId] as const,
        ].map(([label, val, setter]) => (
          <label key={label} className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              {label}
            </span>
            <select
              value={val}
              onChange={(e) => setter(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
            >
              {items.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink-900">
                  step {c.step} · {c.node} · {c.shortId}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
          human_readable
        </p>

        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-xl border border-line bg-ink-800/40"
              />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {!loading && !error && diff && rows.length === 0 && (
          <div className="rounded-xl border border-line bg-ink-950/60 px-4 py-6 text-center text-sm text-slate-500">
            No differences between these two checkpoints.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-2 font-mono text-sm">
            {rows.map((r) => {
              const meta = KIND_META[r.kind];
              return (
                <div
                  key={r.key}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 ${meta.bg}`}
                >
                  <span className={`font-bold ${meta.cls}`}>{meta.sign}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-slate-200">{r.key}</span>
                    <span className="text-slate-500">: </span>
                    {r.kind === "changed" ? (
                      <span className="break-all text-slate-400">
                        {fmt(r.a)} <span className="text-slate-600">→</span>{" "}
                        <span className="text-slate-200">{fmt(r.b)}</span>
                      </span>
                    ) : r.kind === "added" ? (
                      <span className="break-all text-slate-200">{fmt(r.b)}</span>
                    ) : (
                      <span className="break-all text-slate-400 line-through">
                        {fmt(r.a)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
