"use client";

import { useMemo, useState } from "react";
import { THREADS, type Checkpoint } from "@/lib/data";
import { Timeline } from "./Timeline";
import { StateViewer } from "./StateViewer";
import { DiffPanel } from "./DiffPanel";
import { SearchPanel } from "./SearchPanel";

type Tab = "inspect" | "diff" | "search";

export function Dashboard() {
  const [threadId, setThreadId] = useState(THREADS[0].id);
  const [tab, setTab] = useState<Tab>("inspect");

  const thread = useMemo(
    () => THREADS.find((t) => t.id === threadId) ?? THREADS[0],
    [threadId],
  );

  const [selectedId, setSelectedId] = useState<string>(
    thread.checkpoints[thread.checkpoints.length - 1].id,
  );

  const selected: Checkpoint =
    thread.checkpoints.find((c) => c.id === selectedId) ??
    thread.checkpoints[thread.checkpoints.length - 1];

  function switchThread(id: string) {
    setThreadId(id);
    const t = THREADS.find((x) => x.id === id);
    if (t) setSelectedId(t.checkpoints[t.checkpoints.length - 1].id);
  }

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="pill">Interactive demo · sample data</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Checkpoint dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            A faithful view of what the MCP tools return. Pick a thread, inspect
            any checkpoint, diff two states, or search the run in plain English.
          </p>
        </div>
      </div>

      {/* Thread selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {THREADS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchThread(t.id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left transition ${
              t.id === threadId
                ? "border-teal/50 bg-teal/10"
                : "border-line bg-ink-800/50 hover:bg-ink-700/60"
            }`}
          >
            <div>
              <p
                className={`text-sm font-semibold ${
                  t.id === threadId ? "text-teal" : "text-slate-200"
                }`}
              >
                {t.title}
              </p>
              <p className="font-mono text-[11px] text-slate-500">{t.id}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-xl border border-line bg-ink-800/50 p-1">
        {(
          [
            ["inspect", "Inspect"],
            ["diff", "Diff"],
            ["search", "Search"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === id
                ? "bg-teal text-ink-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "inspect" && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Timeline
            thread={thread}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <StateViewer checkpoint={selected} threadId={thread.id} />
        </div>
      )}

      {tab === "diff" && <DiffPanel thread={thread} />}

      {tab === "search" && <SearchPanel />}
    </div>
  );
}
