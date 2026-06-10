import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-950/60">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-7" />
          <div>
            <p className="text-sm font-semibold text-white">
              Tusk<span className="text-teal">Point</span>
            </p>
            <p className="text-xs text-slate-500">
              Verifiable LangGraph checkpoints on Walrus.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="/#tools" className="link-muted">
            Tools
          </Link>
          <Link href="/#architecture" className="link-muted">
            Architecture
          </Link>
          <Link href="/dashboard" className="link-muted">
            Dashboard
          </Link>
          <Link href="/docs" className="link-muted">
            Docs
          </Link>
        </nav>

        <p className="text-xs text-slate-600">
          Built for the Walrus track · UI demo · no secrets stored
        </p>
      </div>
    </footer>
  );
}
