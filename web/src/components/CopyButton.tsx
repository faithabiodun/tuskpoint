"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-700/50 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-ink-600/60 hover:text-white"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-teal" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M8 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8Z" />
            <path d="M4 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2H8a4 4 0 0 1-4-4V6Z" />
          </svg>
          {label ?? "Copy"}
        </>
      )}
    </button>
  );
}
