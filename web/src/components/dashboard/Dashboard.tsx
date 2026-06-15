"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  type CheckpointMeta,
  type Health,
} from "@/lib/api";
import { Timeline, type TimelineItem } from "./Timeline";
import { StateViewer } from "./StateViewer";
import { DiffPanel } from "./DiffPanel";
import { SearchPanel } from "./SearchPanel";
import { WritePanel } from "./WritePanel";
import { RollbackPanel } from "./RollbackPanel";
import { VerifyPanel } from "./VerifyPanel";

type Tab = "inspect" | "diff" | "search" | "write" | "handoff" | "verify";

// Parse the engine's summary prefix "[thread=… step=N] sentence" into the
// pieces the UI shows. The live list endpoint mirrors the MCP tool, which
// carries step inside the summary rather than as a column.
function toItem(c: CheckpointMeta): TimelineItem {
  const stepMatch = c.summary.match(/step=(-?\d+)/);
  const step = stepMatch ? Number(stepMatch[1]) : 0;
  const sentence = c.summary.replace(/^\[[^\]]*\]\s*/, "").trim();
  const node = c.forked_from ? "fork" : step < 0 ? "__input__" : "node";
  return {
    id: c.checkpoint_id,
    shortId: `${c.checkpoint_id.slice(0, 8)}…${c.checkpoint_id.slice(-4)}`,
    step,
    node,
    blobId: c.blob_id,
    parent: c.parent_checkpoint_id,
    forkedFrom: c.forked_from,
    summary: sentence || c.summary,
  };
}

export function Dashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [threadId, setThreadId] = useState<string>("");
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("inspect");
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load a thread's checkpoints live, newest first.
  const loadThread = useCallback(async (id: string, selectLatest = true) => {
    setError(null);
    try {
      const list = await api.listThread(id);
      const mapped = list.checkpoints.map(toItem);
      setItems(mapped);
      if (selectLatest && mapped.length) setSelectedId(mapped[0].id);
      return mapped;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load thread.";
      setError(msg);
      return [];
    }
  }, []);

  // On mount: ask the engine which thread to open, then load it. The free-tier
  // engine may cold-start, so show a "waking" state while the first call lands.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setWaking(true);
      try {
        const h = await api.health();
        if (cancelled) return;
        setHealth(h);
        setWaking(false);
        const seed =
          process.env.NEXT_PUBLIC_DEMO_THREAD || h.seed_thread || "run-43312";
        setThreadId(seed);
        await loadThread(seed);
      } catch (e) {
        if (cancelled) return;
        setWaking(false);
        const msg =
          e instanceof ApiError ? e.message : "Could not reach the live engine.";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadThread]);

  function refresh() {
    if (threadId) loadThread(threadId);
  }

  const tabs: [Tab, string][] = [
    ["inspect", "Inspect"],
    ["diff", "Diff"],
    ["search", "Search"],
    ["write", "Save / Fork"],
    ["handoff", "Rollback / Handoff"],
    ["verify", "Verify"],
  ];

  return (
    <div className="container-page py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8 max-w-3xl">
        <h1 className="display-sm text-display-sm font-extrabold tracking-tight text-cream">
          The checkpoint run, end to end.
        </h1>
        <p className="mt-5 text-sm text-slate-400 sm:text-base">
          This is a demo. It calls the real TuskPoint engine over HTTP, every
          checkpoint, diff, search, save, fork, and audit below hits live Walrus
          storage.
        </p>
      </div>

      {/* Run meta strip (live) */}
      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {[
          ["thread", threadId || "…"],
          ["checkpoints", loading ? "…" : String(items.length)],
          ["memwal", health ? (health.memwal ? "on" : "off") : "…"],
          ["network", health ? `Walrus ${health.network}` : "…"],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-900 px-4 py-3.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {k}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-cream">{v}</p>
          </div>
        ))}
      </div>

      {/* Honest network notice - testnet vs mainnet */}
      {health && (
        <div className="mb-6 flex flex-col gap-1 rounded-xl border border-line bg-ink-900/60 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-2">
          <span
            className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              health.network === "mainnet"
                ? "border-flame/40 bg-flame/10 text-flame"
                : "border-accent/40 bg-accent/10 text-accent"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Walrus {health.network}
          </span>
          {health.network === "mainnet" ? (
            <span>
              Live on <strong className="text-cream">Walrus mainnet</strong>,
              saves and forks are real, paid blob writes.
            </span>
          ) : (
            <span>
              Live on <strong className="text-cream">Walrus testnet</strong> so
              the Save / Fork buttons make <strong className="text-cream">free</strong>{" "}
              writes, visitors can&apos;t spend real funds. Operators can run the
              exact same engine on mainnet by pointing{" "}
              <code className="text-slate-300">WALRUS_PUBLISHER_URL</code> /{" "}
              <code className="text-slate-300">WALRUS_AGGREGATOR_URL</code> at
              mainnet.
            </span>
          )}
        </div>
      )}

      {/* Waking / error banners */}
      {waking && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-flame/20 bg-flame/5 px-4 py-3 text-sm text-flame">
          <span className="h-2 w-2 animate-pulse rounded-full bg-flame" />
          Loading the live engine… this can take up to a minute on the first
          request.
        </div>
      )}
      {error && !waking && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}{" "}
          <button
            onClick={refresh}
            className="ml-2 underline underline-offset-2 hover:text-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 inline-flex flex-wrap rounded-full border border-line bg-ink-900/60 p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition ${
              tab === id ? "bg-flame text-ink-950" : "text-slate-400 hover:text-cream"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && !items.length ? (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-ink-800/40" />
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-ink-800/40" />
        </div>
      ) : (
        <>
          {tab === "inspect" && (
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <Timeline
                items={items}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <StateViewer
                threadId={threadId}
                checkpointId={selectedId}
                item={items.find((i) => i.id === selectedId)}
                network={health?.network}
              />
            </div>
          )}

          {tab === "diff" && <DiffPanel threadId={threadId} items={items} />}

          {tab === "search" && <SearchPanel />}

          {tab === "write" && (
            <WritePanel
              threadId={threadId}
              items={items}
              network={health?.network}
              onChanged={refresh}
              onOpenThread={(id) => {
                setThreadId(id);
                loadThread(id);
                setTab("inspect");
              }}
            />
          )}

          {tab === "handoff" && (
            <RollbackPanel
              threadId={threadId}
              items={items}
              network={health?.network}
              onChanged={refresh}
              onOpenThread={(id) => {
                setThreadId(id);
                loadThread(id);
                setTab("inspect");
              }}
            />
          )}

          {tab === "verify" && <VerifyPanel threadId={threadId} />}
        </>
      )}
    </div>
  );
}
