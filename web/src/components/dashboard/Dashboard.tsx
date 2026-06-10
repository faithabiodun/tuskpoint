"use client";

import { useState } from "react";
import { THREAD, RUN_META, type Checkpoint } from "@/lib/data";
import { Timeline } from "./Timeline";
import { StateViewer } from "./StateViewer";
import { DiffPanel } from "./DiffPanel";
import { SearchPanel } from "./SearchPanel";

type Tab = "inspect" | "diff" | "search";

export function Dashboard() {
  const thread = THREAD;
  const [tab, setTab] = useState<Tab>("inspect");
  const [selectedId, setSelectedId] = useState<string>(
    thread.checkpoints[thread.checkpoints.length - 1].id,
  );

  const selected: Checkpoint =
    thread.checkpoints.find((c) => c.id === selectedId) ??
    thread.checkpoints[thread.checkpoints.length - 1];

  return (
    <div className="container-page py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Real run · live Walrus testnet</p>
        <h1 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
          The checkpoint run, end to end.
        </h1>
        <p className="mt-5 text-sm text-slate-400 sm:text-base">
          Exactly what the MCP tools return for a real
          researcher&nbsp;→&nbsp;writer run. Inspect any checkpoint, diff two
          states, or search the run in plain English. Topic:{" "}
          <span className="text-cream">{RUN_META.topic}</span>.
        </p>
      </div>

      {/* Run meta strip */}
      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {[
          ["thread", thread.id],
          ["checkpoints", String(RUN_META.checkpointCount)],
          ["manifest", `${thread.manifestBlobId.slice(0, 8)}…`],
          ["backend", "Walrus testnet"],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-900 px-4 py-3.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {k}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-cream">{v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-full border border-line bg-ink-900/60 p-1">
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
            className={`rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition ${
              tab === id
                ? "bg-teal text-ink-950"
                : "text-slate-400 hover:text-cream"
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
