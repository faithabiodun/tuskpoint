"use client";

import { useState } from "react";
import { api, ApiError, aggregatorFor } from "@/lib/api";
import type { TimelineItem } from "./Timeline";
import { CopyButton } from "../CopyButton";

const SAMPLE_STATE = JSON.stringify(
  {
    topic: "decentralized storage on Walrus",
    note: "saved live from the dashboard",
  },
  null,
  2,
);

export function WritePanel({
  threadId,
  items,
  onChanged,
  onOpenThread,
  network,
}: {
  threadId: string;
  items: TimelineItem[];
  onChanged: () => void;
  onOpenThread: (id: string) => void;
  network?: string;
}) {
  // Save
  const [stateText, setStateText] = useState(SAMPLE_STATE);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ checkpoint_id: string; blob_id: string | null } | null>(
    null,
  );

  async function save() {
    setSaving(true);
    setSaveErr(null);
    setSaved(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stateText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
        throw new Error("State must be a JSON object.");
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Invalid JSON.");
      setSaving(false);
      return;
    }
    try {
      const res = await api.save(threadId, parsed);
      setSaved({ checkpoint_id: res.checkpoint_id, blob_id: res.blob_id });
      onChanged();
    } catch (e) {
      setSaveErr(e instanceof ApiError ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // Fork
  const [srcCid, setSrcCid] = useState(items[0]?.id ?? "");
  const [newThread, setNewThread] = useState(
    `fork-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [forking, setForking] = useState(false);
  const [forkErr, setForkErr] = useState<string | null>(null);
  const [forked, setForked] = useState<{
    new_thread_id: string;
    checkpoint_id: string;
    blob_id: string;
  } | null>(null);

  async function fork() {
    if (!srcCid || !newThread.trim()) return;
    setForking(true);
    setForkErr(null);
    setForked(null);
    try {
      const res = await api.fork(threadId, srcCid, newThread.trim());
      setForked({
        new_thread_id: res.new_thread_id,
        checkpoint_id: res.checkpoint_id,
        blob_id: res.blob_id,
      });
    } catch (e) {
      setForkErr(e instanceof ApiError ? e.message : "Fork failed.");
    } finally {
      setForking(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Save */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-cream">Save a checkpoint</h2>
        <p className="mt-1 text-xs text-slate-500">
          Live <code className="text-slate-400">checkpoint_save</code> →
          writes a real gzip envelope to Walrus{" "}
          {network === "mainnet" ? "mainnet (paid)" : "testnet (free)"} and
          appends it to{" "}
          <span className="font-mono text-slate-400">{threadId}</span>.
        </p>

        <label className="mt-5 block text-xs font-medium text-slate-400">
          state (JSON object)
        </label>
        <textarea
          value={stateText}
          onChange={(e) => setStateText(e.target.value)}
          rows={7}
          spellCheck={false}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-950/80 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-slate-300 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
        />

        <button
          onClick={save}
          disabled={saving}
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          {saving ? "Writing to Walrus…" : "Save checkpoint"}
        </button>

        {saveErr && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {saveErr}
          </div>
        )}
        {saved && (
          <div className="mt-4 rounded-xl border border-flame/20 bg-flame/5 px-4 py-3 text-xs">
            <p className="font-semibold text-flame">Saved live.</p>
            <p className="mt-1 break-all font-mono text-slate-400">
              checkpoint {saved.checkpoint_id}
            </p>
            {saved.blob_id && (
              <p className="mt-1 flex items-center gap-2">
                <a
                  href={`${aggregatorFor(network)}${saved.blob_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-slate-300 hover:text-flame"
                >
                  blob {saved.blob_id}
                </a>
                <CopyButton text={saved.blob_id} />
              </p>
            )}
          </div>
        )}
      </div>

      {/* Fork */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-cream">
          Fork into a new thread
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Live <code className="text-slate-400">checkpoint_fork</code>, branch
          any checkpoint into a brand-new thread, preserving lineage.
        </p>

        <label className="mt-5 block text-xs font-medium text-slate-400">
          source checkpoint
        </label>
        <select
          value={srcCid}
          onChange={(e) => setSrcCid(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
        >
          {items.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink-900">
              step {c.step} · {c.node} · {c.shortId}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-medium text-slate-400">
          new thread id
        </label>
        <input
          value={newThread}
          onChange={(e) => setNewThread(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 font-mono text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
        />

        <button
          onClick={fork}
          disabled={forking}
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          {forking ? "Forking…" : "Fork checkpoint"}
        </button>

        {forkErr && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {forkErr}
          </div>
        )}
        {forked && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-xs">
            <p className="font-semibold text-accent">Forked live.</p>
            <p className="mt-1 break-all font-mono text-slate-400">
              thread {forked.new_thread_id}
            </p>
            <p className="mt-1 break-all font-mono text-slate-400">
              blob {forked.blob_id}
            </p>
            <button
              onClick={() => onOpenThread(forked.new_thread_id)}
              className="btn-ghost mt-3"
            >
              Open the forked thread →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
