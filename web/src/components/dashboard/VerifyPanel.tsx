"use client";

import { useState } from "react";
import { api, ApiError, type VerifyResult } from "@/lib/api";

export function VerifyPanel({ threadId }: { threadId: string }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.verify(threadId);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-cream">
            Verify the blob trail
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Live <code className="text-slate-400">verify_trail</code> — re-fetches
            every checkpoint&apos;s content-addressed Walrus blob in order and
            confirms it still unpacks. Any tampering or corruption fails a step.
          </p>
        </div>
        <button onClick={run} disabled={loading} className="btn-primary shrink-0">
          {loading ? "Verifying…" : "Run verify"}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl border border-line bg-ink-800/40"
            />
          ))}
        </div>
      )}

      {result && !loading && (
        <>
          <div
            className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
              result.ok
                ? "border-flame/20 bg-flame/5 text-flame"
                : "border-rose-500/30 bg-rose-500/5 text-rose-300"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                result.ok ? "bg-flame" : "bg-rose-400"
              }`}
            />
            {result.ok
              ? `Trail intact — ${result.verified}/${result.checkpoint_count} blobs hash-verified, 0 tampered.`
              : result.tampered_count > 0
                ? `Trail FAILED — ${result.tampered_count} blob(s) tampered of ${result.checkpoint_count}.`
                : `Unverifiable — ${result.verified}/${result.checkpoint_count} carry a stored hash.`}
          </div>

          <ol className="mt-4 space-y-2">
            {result.steps.map((s) => (
              <li
                key={s.checkpoint_id}
                className="flex items-start gap-3 rounded-xl border border-line bg-ink-950/60 px-4 py-3"
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    s.status === "PASS"
                      ? "bg-flame"
                      : s.status === "FAIL"
                        ? "bg-rose-400"
                        : "bg-slate-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
                        s.status === "PASS"
                          ? "bg-flame/10 text-flame"
                          : s.status === "FAIL"
                            ? "bg-rose-500/10 text-rose-300"
                            : "bg-slate-700/40 text-slate-400"
                      }`}
                    >
                      {s.status}
                    </span>
                    <p className="break-all font-mono text-xs text-slate-300">
                      {s.checkpoint_id}
                    </p>
                  </div>
                  <p className="mt-0.5 break-all font-mono text-[10px] text-slate-600">
                    blob {s.blob_id}
                  </p>
                  {s.stored_hash ? (
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-600">
                      sha256 {s.recomputed_hash ?? "—"}
                      {s.status === "PASS" ? " ✓ matches stored" : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-600">
                      no stored hash (written before integrity proofs)
                    </p>
                  )}
                  {s.status === "FAIL" && (
                    <p className="mt-1 text-xs text-rose-300">
                      recomputed hash does not match stored — blob changed.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
