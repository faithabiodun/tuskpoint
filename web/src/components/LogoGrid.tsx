"use client";

import { useEffect, useState } from "react";

// Every client / runtime that can drive TuskPoint over MCP, plus the stack it
// runs on. Each entry maps to a real config in the `tuskpoint_info` tool and
// the /docs/clients page, so nothing here is aspirational. The `mark` is a
// brand-neutral monogram (no third-party logo assets) drawn inline as an SVG.
export type Client = { label: string; mark: string };

const CLIENTS: Client[] = [
  { label: "Claude Code", mark: "CC" },
  { label: "Claude Desktop", mark: "CD" },
  { label: "Cursor", mark: "Cu" },
  { label: "Windsurf", mark: "Wi" },
  { label: "VS Code", mark: "VS" },
  { label: "Codex CLI", mark: "Cx" },
  { label: "Gemini CLI", mark: "Ge" },
  { label: "Zed", mark: "Ze" },
  { label: "Cline", mark: "Cl" },
  { label: "Continue", mark: "Co" },
  { label: "LangGraph", mark: "LG" },
  { label: "Any MCP client", mark: "··" },
];

// Number of visible tiles in the grid. Each tile owns a disjoint slice of the
// client pool and cycles through it, so the whole grid is always "rotating".
const TILES = 8;

function tilePools(): Client[][] {
  const pools: Client[][] = Array.from({ length: TILES }, () => []);
  CLIENTS.forEach((c, i) => pools[i % TILES].push(c));
  return pools;
}

function Tile({ pool, delay }: { pool: Client[]; delay: number }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (pool.length < 2) return;
    // Start each tile's cycle on its own offset so they don't flip in unison.
    let mounted = true;
    const hold = 2600;
    let outTimer: ReturnType<typeof setTimeout>;
    let inTimer: ReturnType<typeof setTimeout>;

    const cycle = () => {
      if (!mounted) return;
      setPhase("out");
      outTimer = setTimeout(() => {
        if (!mounted) return;
        setIdx((i) => (i + 1) % pool.length);
        setPhase("in");
      }, 450);
    };

    const startTimer = setTimeout(function loop() {
      cycle();
      inTimer = setTimeout(loop, hold);
    }, delay);

    return () => {
      mounted = false;
      clearTimeout(startTimer);
      clearTimeout(outTimer);
      clearTimeout(inTimer);
    };
  }, [pool, delay]);

  const c = pool[idx];

  return (
    <div className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-ink-950/50 p-3 transition-colors hover:border-flame/40 hover:bg-ink-900/60">
      <div
        key={`${c.label}-${phase}`}
        className={`flex flex-col items-center gap-2 ${
          phase === "out" ? "animate-tile-out" : "animate-tile-in"
        }`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-flame/25 bg-flame/10 font-mono text-sm font-bold tracking-tight text-flame shadow-[0_0_18px_-6px_rgba(47,212,192,0.55)]">
          {c.mark}
        </span>
        <span className="text-center text-[11px] font-medium leading-tight text-slate-300">
          {c.label}
        </span>
      </div>
    </div>
  );
}

export function LogoGrid() {
  const pools = tilePools();
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label="MCP clients and runtimes TuskPoint plugs into"
    >
      {pools.map((pool, i) => (
        <Tile key={i} pool={pool} delay={i * 320} />
      ))}
    </div>
  );
}
