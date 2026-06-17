"use client";

import { useEffect, useState } from "react";
import { CLIENT_LOGOS, type ClientLogo } from "./ClientLogos";

// Number of visible tiles in the grid. Each tile owns a disjoint slice of the
// client pool and cycles through it, so the whole grid is always "rotating"
// through the real MCP clients TuskPoint plugs into.
const TILES = 8;

function tilePools(): ClientLogo[][] {
  const pools: ClientLogo[][] = Array.from({ length: TILES }, () => []);
  CLIENT_LOGOS.forEach((c, i) => pools[i % TILES].push(c));
  return pools;
}

function Tile({ pool, delay }: { pool: ClientLogo[]; delay: number }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (pool.length < 2) return;
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
  const Icon = c.Icon;

  return (
    <div className="group flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl border border-line bg-ink-950/50 p-3 transition-colors hover:border-flame/40 hover:bg-ink-900/60">
      <div
        key={`${c.label}-${phase}`}
        className={`flex flex-col items-center gap-2.5 ${
          phase === "out" ? "animate-tile-out" : "animate-tile-in"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white/[0.04] p-2 shadow-[0_0_18px_-8px_rgba(47,212,192,0.5)]">
          <Icon className="h-7 w-7" />
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
      aria-label="MCP clients TuskPoint plugs into"
    >
      {pools.map((pool, i) => (
        <Tile key={i} pool={pool} delay={i * 320} />
      ))}
    </div>
  );
}
