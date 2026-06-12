"use client";

import { useEffect, useState } from "react";
import { api, ApiError, aggregatorFor } from "@/lib/api";
import type { TimelineItem } from "./Timeline";
import { CopyButton } from "../CopyButton";

function JsonView({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  return (
    <pre className="whitespace-pre-wrap break-words rounded-xl border border-line bg-ink-950/80 px-4 py-3.5 text-[13px] leading-relaxed">
      <code className="font-mono text-slate-300">{json}</code>
    </pre>
  );
}

export function StateViewer({
  threadId,
  checkpointId,
  item,
  network,
}: {
  threadId: string;
  checkpointId: string;
  item?: TimelineItem;
  network?: string;
}) {
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the exact checkpoint state live from the engine whenever the
  // selection changes. No baked snapshot — this is a real Walrus read.
  useEffect(() => {
    if (!threadId || !checkpointId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setState(null);
    api
      .loadCheckpoint(threadId, checkpointId)
      .then((res) => {
        if (!cancelled) setState(res.state);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError ? e.message : "Failed to load checkpoint state.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, checkpointId]);

  if (!checkpointId) {
    return (
      <div className="card p-6">
        <p className="rounded-xl border border-line bg-ink-950/60 px-4 py-6 text-center text-sm text-slate-500">
          Select a checkpoint to inspect its state.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-cream">Checkpoint state</h2>
          <p className="mt-1 font-mono text-xs text-slate-500">{checkpointId}</p>
        </div>
        {state !== null && (
          <CopyButton
            text={JSON.stringify(state, null, 2)}
            label="Copy state"
          />
        )}
      </div>

      {/* Metadata grid (from the live timeline item) */}
      {item && (
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["node", item.node],
            ["step", String(item.step)],
            ["parent", item.parent ? item.shortId : "— (root)"],
            ["thread", threadId],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-line bg-ink-800/50 px-3 py-2.5"
            >
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">
                {k}
              </dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-slate-200">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Walrus blob link */}
      {item && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-flame/20 bg-flame/5 px-4 py-3">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0 text-flame"
            fill="currentColor"
          >
            <path d="M10 2a4 4 0 0 0-4 4v1H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm2 5H8V6a2 2 0 1 1 4 0v1Z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-flame/80">
              Walrus blob id
            </p>
            <a
              href={`${aggregatorFor(network)}${item.blobId}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate font-mono text-xs text-slate-300 hover:text-flame"
              title={item.blobId}
            >
              {item.blobId}
            </a>
          </div>
          <CopyButton text={item.blobId} />
        </div>
      )}

      <p className="mt-5 mb-2 text-xs uppercase tracking-wider text-slate-500">
        channel_values
      </p>

      {loading && (
        <div className="h-24 animate-pulse rounded-xl border border-line bg-ink-800/40" />
      )}
      {error && !loading && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {!loading && !error && state !== null && <JsonView value={state} />}
      {!loading && !error && state === null && (
        <div className="rounded-xl border border-line bg-ink-950/60 px-4 py-6 text-center text-sm text-slate-500">
          This checkpoint carries no state (e.g. the initial input).
        </div>
      )}
    </div>
  );
}
