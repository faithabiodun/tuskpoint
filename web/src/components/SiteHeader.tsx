import Link from "next/link";
import { REPO_URL } from "@/lib/data";
import { Logo } from "./Logo";

const NAV = [
  { href: "/#tools", label: "Tools" },
  { href: "/skills/setup", label: "Install", external: true },
  { href: "/dashboard", label: "Run" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink-950/75 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo idPrefix="hdr" markClassName="h-9 w-9" />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 transition hover:text-cream"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 transition hover:text-cream"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-primary !px-4 !py-2 text-[13px]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17 4.5 18 4.8 18 4.8c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" />
          </svg>
          GitHub
        </a>
      </div>
    </header>
  );
}
