import type { Thread } from "@/lib/data";

const NODE_COLOR: Record<string, string> = {
  __input__: "bg-slate-500",
  researcher: "bg-teal",
  writer: "bg-accent",
};

export function Timeline({
  thread,
  selectedId,
  onSelect,
}: {
  thread: Thread;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  // newest first
  const ordered = [...thread.checkpoints].reverse();

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          Checkpoints
          <span className="ml-2 text-slate-500">{thread.checkpoints.length}</span>
        </h2>
        <span className="font-mono text-[10px] text-slate-600">
          manifest {thread.manifestBlobId.slice(0, 8)}…
        </span>
      </div>

      <ol className="relative space-y-1">
        <span className="absolute left-[15px] top-2 bottom-2 w-px bg-line" />
        {ordered.map((c) => {
          const active = c.id === selectedId;
          return (
            <li key={c.id} className="relative">
              <button
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                  active ? "bg-teal/10" : "hover:bg-ink-700/50"
                }`}
              >
                <span className="relative z-10 mt-0.5 flex h-2.5 w-2.5 shrink-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ring-4 ring-ink-800 ${
                      NODE_COLOR[c.node] ?? "bg-slate-500"
                    }`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        active ? "text-teal" : "text-slate-200"
                      }`}
                    >
                      {c.node}
                    </span>
                    <span className="shrink-0 rounded-md border border-line bg-ink-700/60 px-1.5 py-0.5 text-[10px] text-slate-400">
                      step {c.step}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">
                    {c.summary}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-slate-600">
                    {c.shortId}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
