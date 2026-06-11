"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV } from "./nav";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav className="space-y-7">
      {DOC_NAV.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block rounded-lg px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-teal/10 font-semibold text-teal"
                        : "text-slate-400 hover:bg-ink-700/50 hover:text-cream"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
