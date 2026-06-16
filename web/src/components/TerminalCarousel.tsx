"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "./CopyButton";

type Step = {
  tag: string;
  title: string;
  command: string;
  /** Output lines printed under the command (purely illustrative). */
  output: { text: string; tone?: "muted" | "flame" | "cream" }[];
};

// The real journey of running TuskPoint, start to finish. Commands match the
// README quick-start so a visitor can copy any one and run it.
const STEPS: Step[] = [
  {
    tag: "install",
    title: "Add TuskPoint as a plugin",
    command: "uvx tuskpoint-mcp",
    output: [
      { text: "no clone, no config · works in any MCP client", tone: "muted" },
      { text: "tuskpoint ready · 11 tools available ✓", tone: "flame" },
    ],
  },
  {
    tag: "verify",
    title: "Prove the Walrus round-trip",
    command: "python scripts/check_walrus.py",
    output: [
      { text: "PUT  blob → publisher.walrus-testnet …", tone: "muted" },
      { text: "GET  blob ← aggregator … bytes identical ✓", tone: "flame" },
    ],
  },
  {
    tag: "crash + resume",
    title: "Survive a process kill",
    command: "python demo/run_demo.py --real --part2",
    output: [
      { text: "fresh process - no state in memory", tone: "muted" },
      { text: "resumed from Walrus → run completed ✓", tone: "flame" },
    ],
  },
  {
    tag: "rollback",
    title: "Roll back to any step",
    command: "python demo/run_demo.py --rollback",
    output: [
      { text: "history preserved: 4 → 5 (append-only)", tone: "muted" },
      { text: "live head is the restored state ✓", tone: "flame" },
    ],
  },
  {
    tag: "hand-off",
    title: "Hand a run to another agent",
    command: "python demo/run_demo.py --handoff",
    output: [
      { text: "Agent A → descriptor (blob + sha256)", tone: "muted" },
      { text: "Agent B adopted - hash verified ✓", tone: "flame" },
    ],
  },
  {
    tag: "verify trail",
    title: "Audit the whole run",
    command: "tuskpoint · verify_trail(thread)",
    output: [
      { text: "re-hashing every blob against its stored SHA-256 …", tone: "muted" },
      { text: "trail intact · 6/6 PASS · tamper-evident ✓", tone: "flame" },
    ],
  },
];

const ADVANCE_MS = 4500;

function toneClass(tone?: "muted" | "flame" | "cream") {
  if (tone === "flame") return "text-flame";
  if (tone === "cream") return "text-cream";
  return "text-slate-500";
}

export function TerminalCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = STEPS.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // Auto-advance, paused on hover/focus/drag or if the user prefers reduced motion.
  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  // Pointer/touch swipe.
  const dragX = useRef<number | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    dragX.current = e.clientX;
    setPaused(true);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    setPaused(false);
  }

  return (
    <div
      className="animate-fade-up mt-9 w-full max-w-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="group relative overflow-hidden rounded-2xl border border-line bg-ink-950/80 shadow-card backdrop-blur-sm"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragX.current = null;
          setPaused(false);
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className={`h-2.5 w-2.5 rounded-full transition-colors duration-500 ${
                d === index % 3 ? "bg-flame" : "bg-white/15"
              }`}
            />
          ))}
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {STEPS[index].tag}
          </span>
          <span className="ml-auto font-mono text-[10px] text-slate-600">
            {index + 1} / {count}
          </span>
        </div>

        {/* Sliding track */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {STEPS.map((s) => (
              <div key={s.tag} className="w-full shrink-0 px-4 py-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <code className="truncate font-mono text-sm text-slate-200 sm:text-[15px]">
                    <span className="text-flame">$ </span>
                    {s.command}
                  </code>
                  <CopyButton text={s.command} />
                </div>
                <div className="mt-3 space-y-1 font-mono text-[12px] leading-relaxed">
                  {s.output.map((o, j) => (
                    <p key={j} className={toneClass(o.tone)}>
                      {o.text}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prev / Next arrows */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous step"
          className="absolute left-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink-900/80 text-slate-400 opacity-0 transition hover:text-cream group-hover:opacity-100 focus-visible:opacity-100"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.7 4.3a1 1 0 0 1 0 1.4L8.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next step"
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink-900/80 text-slate-400 opacity-0 transition hover:text-cream group-hover:opacity-100 focus-visible:opacity-100"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4Z"
            />
          </svg>
        </button>
      </div>

      {/* Step label + dots */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <span className="font-mono text-[11px] text-slate-500">
          {STEPS[index].title}
        </span>
        <span className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.tag}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-flame"
                  : "w-1.5 bg-slate-600 hover:bg-slate-400"
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
