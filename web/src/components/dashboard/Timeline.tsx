export type TimelineItem = {
  id: string;
  shortId: string;
  step: number;
  node: string;
  blobId: string;
  parent: string | null;
  forkedFrom: string | null;
  summary: string;
};

const NODE_COLOR: Record<string, string> = {
  __input__: "bg-slate-500",
  fork: "bg-accent",
  node: "bg-flame",
};

export function Timeline({
  items,
  selectedId,
  onSelect,
}: {
  items: TimelineItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cream">
          Checkpoints
          <span className="ml-2 text-slate-500">{items.length}</span>
        </h2>
        <span className="font-mono text-[10px] text-slate-600">newest first</span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-line bg-ink-950/60 px-4 py-6 text-center text-sm text-slate-500">
          No checkpoints in this thread yet.
        </p>
      ) : (
        <ol className="relative space-y-1">
          <span className="absolute left-[15px] top-2 bottom-2 w-px bg-line" />
          {items.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id} className="relative">
                <button
                  onClick={() => onSelect(c.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                    active ? "bg-flame/10" : "hover:bg-ink-700/50"
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
                          active ? "text-flame" : "text-slate-200"
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
      )}
    </div>
  );
}
