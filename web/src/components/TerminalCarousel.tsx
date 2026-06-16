"use client";

import { CopyButton } from "./CopyButton";

// The one copy-and-run line that adds TuskPoint as a plugin in any MCP client.
// Kept as a single static terminal card so the hero shows exactly the command a
// first-time visitor can run.
const INSTALL = {
  tag: "install",
  command: "uvx tuskpoint-mcp",
};

export function TerminalCarousel() {
  return (
    <div className="animate-fade-up mt-9 w-full max-w-xl">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-950/80 shadow-card backdrop-blur-sm">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className={`h-2.5 w-2.5 rounded-full ${
                d === 0 ? "bg-flame" : "bg-white/15"
              }`}
            />
          ))}
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {INSTALL.tag}
          </span>
        </div>

        {/* Command + output */}
        <div className="px-4 py-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <code className="truncate font-mono text-sm text-slate-200 sm:text-[15px]">
              <span className="text-flame">$ </span>
              {INSTALL.command}
            </code>
            <CopyButton text={INSTALL.command} />
          </div>
        </div>
      </div>
    </div>
  );
}
