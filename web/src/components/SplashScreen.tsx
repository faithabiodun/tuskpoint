"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

const HOLD_MS = 2000; // logo visible
const FADE_MS = 500; // fade-out duration

/**
 * A brief logo splash shown the first time a visitor lands in a session.
 * Holds the TuskPoint mark + wordmark for ~2s, then fades out and unmounts.
 * Gated by sessionStorage so it shows once per tab session, not on every
 * client-side navigation. Respects prefers-reduced-motion by skipping it.
 */
export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = sessionStorage.getItem("tp-splash-seen");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (seen || reduce) return;

    sessionStorage.setItem("tp-splash-seen", "1");
    setShow(true);

    const fadeTimer = setTimeout(() => setLeaving(true), HOLD_MS);
    const doneTimer = setTimeout(() => setShow(false), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-ink-950 transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <LogoMark className="h-20 w-20 animate-[tp-rise_0.7s_ease-out]" idPrefix="splash" />
        <span className="text-2xl font-extrabold tracking-tight text-cream animate-[tp-rise_0.7s_ease-out_0.1s_both]">
          Tusk<span className="text-flame">Point</span>
        </span>
      </div>

      <style>{`
        @keyframes tp-rise {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
