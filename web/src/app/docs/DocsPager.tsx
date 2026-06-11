"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_ORDER } from "./nav";

export function DocsPager() {
  const pathname = usePathname();
  const idx = DOC_ORDER.findIndex((l) => l.href === pathname);
  const prev = idx > 0 ? DOC_ORDER[idx - 1] : null;
  const next =
    idx >= 0 && idx < DOC_ORDER.length - 1 ? DOC_ORDER[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group rounded-xl border border-line bg-ink-900/50 px-4 py-3 transition hover:border-teal/40"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            ← Previous
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-cream group-hover:text-teal">
            {prev.label}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group rounded-xl border border-line bg-ink-900/50 px-4 py-3 text-right transition hover:border-teal/40"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Next →
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-cream group-hover:text-teal">
            {next.label}
          </span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
