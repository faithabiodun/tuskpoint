"use client";

import { useMemo, useState } from "react";
import type { Thread } from "@/lib/data";

type DiffRow =
  | { kind: "added"; key: string; b: unknown }
  | { kind: "removed"; key: string; a: unknown }
  | { kind: "changed"; key: string; a: unknown; b: unknown };

function computeDiff(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): DiffRow[] {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  const rows: DiffRow[] = [];
  for (const key of keys.sort()) {
    const inA = key in a;
    const inB = key in b;
    if (inA && !inB) rows.push({ kind: "removed", key, a: a[key] });
    else if (!inA && inB) rows.push({ kind: "added", key, b: b[key] });
    else if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
      rows.push({ kind: "changed", key, a: a[key], b: b[key] });
  }
  return rows;
}

function fmt(v: unknown) {
  return JSON.stringify(v);
}

const KIND_META = {
  added: { sign: "+", cls: "text-teal", bg: "bg-teal/5 border-teal/20" },
  removed: { sign: "−", cls: "text-rose-400", bg: "bg-rose-500/5 border-rose-500/20" },
  changed: { sign: "~", cls: "text-amber-300", bg: "bg-amber-400/5 border-amber-400/20" },
} as const;

export function DiffPanel({ thread }: { thread: Thread }) {
  const cps = thread.checkpoints;
  const [aId, setAId] = useState(cps[0].id);
  const [bId, setBId] = useState(cps[cps.length - 1].id);

  const a = cps.find((c) => c.id === aId) ?? cps[0];
  const b = cps.find((c) => c.id === bId) ?? cps[cps.length - 1];

  const rows = useMemo(() => computeDiff(a.state, b.state), [a, b]);

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-white">Compare checkpoints</h2>
      <p className="mt-1 text-xs text-slate-500">
        Exactly what <code className="text-slate-400">checkpoint_diff</code>{" "}
        returns: added, removed, and changed keys.
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
              className="w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-teal/50 focus:ring-2 focus:ring-teal/20"
            >
              {cps.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink-900">
                  step {c.step} · {c.node} · {c.shortId}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Human-readable diff */}
      <div className="mt-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
          human_readable
        </p>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-line bg-ink-950/60 px-4 py-6 text-center text-sm text-slate-500">
            No differences between these two checkpoints.
          </div>
        ) : (
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
                        {fmt(r.a)}{" "}
                        <span className="text-slate-600">→</span>{" "}
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
