import Link from "next/link";
import { REPO_URL } from "@/lib/data";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-ink-950/70">
      <div className="container-page py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" idPrefix="ftr" />
              <p className="text-2xl font-extrabold tracking-tight text-cream">
                Tusk<span className="text-flame">Point</span>
              </p>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Verifiable LangGraph checkpoints on Walrus. Survive a crash, rewind
              to any moment, and search your run in plain English.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2.5 font-mono text-[12px] uppercase tracking-[0.14em] sm:grid-cols-3">
            <Link href="/#problem" className="link-muted">
              Problem
            </Link>
            <Link href="/#tools" className="link-muted">
              Tools
            </Link>
            <Link href="/#architecture" className="link-muted">
              How it works
            </Link>
            <Link href="/dashboard" className="link-muted">
              The run
            </Link>
            <Link href="/docs" className="link-muted">
              Docs
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="link-muted"
            >
              GitHub
            </a>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TuskPoint.</p>
          <p className="flex items-center gap-2 font-mono uppercase tracking-[0.18em]">
            <a
              href="https://www.walrus.xyz"
              target="_blank"
              rel="noreferrer"
              className="link-muted"
            >
              Walrus
            </a>
            <span aria-hidden>·</span>
            <a
              href="https://memory.walrus.xyz"
              target="_blank"
              rel="noreferrer"
              className="link-muted"
            >
              MemWal
            </a>
            <span aria-hidden>·</span>
            <a
              href="https://sui.io"
              target="_blank"
              rel="noreferrer"
              className="link-muted"
            >
              Sui
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
