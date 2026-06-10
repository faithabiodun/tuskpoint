import { CopyButton } from "./CopyButton";

export function CodeBlock({
  code,
  label,
  lang = "bash",
}: {
  code: string;
  label?: string;
  lang?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink-950/80">
      <div className="flex items-center justify-between border-b border-line bg-ink-800/60 px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
          {label ?? lang}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-sm leading-relaxed">
        <code className="font-mono text-slate-300">{code}</code>
      </pre>
    </div>
  );
}
