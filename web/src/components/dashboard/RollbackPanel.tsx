"use client";

import { useState } from "react";
import {
  api,
  ApiError,
  aggregatorFor,
  type HandoffDescriptor,
} from "@/lib/api";
import type { TimelineItem } from "./Timeline";
import { CopyButton } from "../CopyButton";

// Rollback + cross-agent handoff, both live. Rollback is append-only (it writes
// an earlier state as a *new* head, never deleting history), so the verifiable
// trail stays intact. Handoff emits a portable, hash-stamped descriptor that a
// second agent adopts into a fresh thread — the blob is re-fetched and its
// SHA-256 checked before it becomes state, so a tampered blob is rejected.
export function RollbackPanel({
  threadId,
  items,
  network,
  onChanged,
  onOpenThread,
}: {
  threadId: string;
  items: TimelineItem[];
  network?: string;
  onChanged: () => void;
  onOpenThread: (id: string) => void;
}) {
  // --- Rollback ---
  const [rbCid, setRbCid] = useState(items[1]?.id ?? items[0]?.id ?? "");
  const [rolling, setRolling] = useState(false);
  const [rbErr, setRbErr] = useState<string | null>(null);
  const [rolled, setRolled] = useState<{
    checkpoint_id: string;
    restored_from: string;
    blob_id: string;
  } | null>(null);

  async function rollback() {
    if (!rbCid) return;
    setRolling(true);
    setRbErr(null);
    setRolled(null);
    try {
      const res = await api.rollback(threadId, rbCid);
      setRolled({
        checkpoint_id: res.checkpoint_id,
        restored_from: res.restored_from,
        blob_id: res.blob_id,
      });
      onChanged();
    } catch (e) {
      setRbErr(e instanceof ApiError ? e.message : "Rollback failed.");
    } finally {
      setRolling(false);
    }
  }

  // --- Handoff + adopt ---
  const [hoCid, setHoCid] = useState(items[0]?.id ?? "");
  const [toAgent, setToAgent] = useState("agent-b");
  const [descriptor, setDescriptor] = useState<HandoffDescriptor | null>(null);
  const [handing, setHanding] = useState(false);
  const [hoErr, setHoErr] = useState<string | null>(null);

  const [adoptThread, setAdoptThread] = useState(
    `adopt-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [adopting, setAdopting] = useState(false);
  const [adoptErr, setAdoptErr] = useState<string | null>(null);
  const [adopted, setAdopted] = useState<{
    new_thread_id: string;
    checkpoint_id: string;
    blob_id: string;
    verified: boolean;
  } | null>(null);

  async function handoff() {
    if (!hoCid) return;
    setHanding(true);
    setHoErr(null);
    setDescriptor(null);
    setAdopted(null);
    setAdoptErr(null);
    try {
      const res = await api.handoff(threadId, hoCid, toAgent.trim() || undefined);
      setDescriptor(res);
    } catch (e) {
      setHoErr(e instanceof ApiError ? e.message : "Handoff failed.");
    } finally {
      setHanding(false);
    }
  }

  async function adopt() {
    if (!descriptor || !adoptThread.trim()) return;
    setAdopting(true);
    setAdoptErr(null);
    setAdopted(null);
    try {
      const res = await api.adopt(descriptor, adoptThread.trim());
      setAdopted({
        new_thread_id: res.new_thread_id,
        checkpoint_id: res.checkpoint_id,
        blob_id: res.blob_id,
        verified: res.verified,
      });
    } catch (e) {
      setAdoptErr(e instanceof ApiError ? e.message : "Adopt failed.");
    } finally {
      setAdopting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Rollback */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-cream">
          Roll back to an earlier checkpoint
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Live <code className="text-slate-400">checkpoint_rollback</code> —
          re-writes an earlier state as a <strong>new head</strong> of{" "}
          <span className="font-mono text-slate-400">{threadId}</span>.
          Append-only: nothing is deleted, so the audit trail stays intact and
          still verifies.
        </p>

        <label className="mt-5 block text-xs font-medium text-slate-400">
          restore which checkpoint
        </label>
        <select
          value={rbCid}
          onChange={(e) => setRbCid(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
        >
          {items.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink-900">
              step {c.step} · {c.node} · {c.shortId}
            </option>
          ))}
        </select>

        <button
          onClick={rollback}
          disabled={rolling}
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          {rolling ? "Writing rollback…" : "Roll back"}
        </button>

        {rbErr && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {rbErr}
          </div>
        )}
        {rolled && (
          <div className="mt-4 rounded-xl border border-flame/20 bg-flame/5 px-4 py-3 text-xs">
            <p className="font-semibold text-flame">Rolled back live.</p>
            <p className="mt-1 break-all font-mono text-slate-400">
              new head {rolled.checkpoint_id}
            </p>
            <p className="mt-1 break-all font-mono text-slate-500">
              restored from {rolled.restored_from}
            </p>
            {rolled.blob_id && (
              <p className="mt-1 flex items-center gap-2">
                <a
                  href={`${aggregatorFor(network)}${rolled.blob_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-slate-300 hover:text-flame"
                >
                  blob {rolled.blob_id}
                </a>
                <CopyButton text={rolled.blob_id} />
              </p>
            )}
          </div>
        )}
      </div>

      {/* Handoff + adopt */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-cream">
          Hand off to another agent
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Live <code className="text-slate-400">handoff_checkpoint</code> →{" "}
          <code className="text-slate-400">adopt_checkpoint</code>. The handoff
          is a tiny descriptor (blob id + SHA-256). A second agent re-fetches the
          blob and verifies the hash before it becomes state — a tampered blob is
          rejected.
        </p>

        <label className="mt-5 block text-xs font-medium text-slate-400">
          checkpoint to hand off
        </label>
        <select
          value={hoCid}
          onChange={(e) => setHoCid(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
        >
          {items.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink-900">
              step {c.step} · {c.node} · {c.shortId}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-medium text-slate-400">
          to agent (label)
        </label>
        <input
          value={toAgent}
          onChange={(e) => setToAgent(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 font-mono text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
        />

        <button
          onClick={handoff}
          disabled={handing}
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          {handing ? "Building descriptor…" : "Create handoff"}
        </button>

        {hoErr && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {hoErr}
          </div>
        )}

        {descriptor && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-xs">
            <p className="font-semibold text-accent">Handoff descriptor ready.</p>
            <p className="mt-1 break-all font-mono text-slate-400">
              blob {descriptor.blob_id}
            </p>
            <p className="mt-1 break-all font-mono text-slate-500">
              sha256 {descriptor.blob_sha256 ?? "—"}
            </p>

            <div className="mt-4 border-t border-line pt-3">
              <label className="block text-xs font-medium text-slate-400">
                adopt into new thread
              </label>
              <input
                value={adoptThread}
                onChange={(e) => setAdoptThread(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-ink-800/70 px-3 py-2.5 font-mono text-sm text-slate-200 outline-none transition focus:border-flame/50 focus:ring-2 focus:ring-flame/20"
              />
              <button
                onClick={adopt}
                disabled={adopting}
                className="btn-primary mt-3 w-full sm:w-auto"
              >
                {adopting ? "Verifying + adopting…" : "Adopt (verify hash)"}
              </button>
            </div>
          </div>
        )}

        {adoptErr && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            {adoptErr}
          </div>
        )}
        {adopted && (
          <div className="mt-4 rounded-xl border border-flame/20 bg-flame/5 px-4 py-3 text-xs">
            <p className="font-semibold text-flame">
              Adopted live{adopted.verified ? " — hash verified ✓" : ""}.
            </p>
            <p className="mt-1 break-all font-mono text-slate-400">
              thread {adopted.new_thread_id}
            </p>
            <p className="mt-1 break-all font-mono text-slate-500">
              genesis {adopted.checkpoint_id}
            </p>
            <button
              onClick={() => onOpenThread(adopted.new_thread_id)}
              className="btn-ghost mt-3"
            >
              Open the adopted thread →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
