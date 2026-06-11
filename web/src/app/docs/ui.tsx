import type { ReactNode } from "react";

export function DocTitle({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
}) {
  return (
    <header className="mb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-cream sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-400">{intro}</p>
    </header>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-24 text-2xl font-bold text-cream first:mt-0"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 text-lg font-semibold text-cream">{children}</h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 leading-relaxed text-slate-400">{children}</p>;
}

export function Callout({
  tone = "teal",
  title,
  children,
}: {
  tone?: "teal" | "amber";
  title: string;
  children: ReactNode;
}) {
  const styles =
    tone === "amber"
      ? "border-amber-400/25 bg-amber-400/5"
      : "border-teal/20 bg-teal/5";
  const titleColor = tone === "amber" ? "text-amber-300" : "text-teal";
  return (
    <div className={`card mt-6 p-5 ${styles}`}>
      <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-ink-800/70 px-1.5 py-0.5 font-mono text-[13px] text-slate-200">
      {children}
    </code>
  );
}
