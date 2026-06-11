import { type Checkpoint, WALRUS_AGGREGATOR } from "@/lib/data";
import { CopyButton } from "../CopyButton";

function JsonView({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  return (
    <pre className="overflow-x-auto rounded-xl border border-line bg-ink-950/80 px-4 py-3.5 text-[13px] leading-relaxed">
      <code className="font-mono text-slate-300">{json}</code>
    </pre>
  );
}

export function StateViewer({
  checkpoint,
  threadId,
}: {
  checkpoint: Checkpoint;
  threadId: string;
}) {
  const aggregatorUrl = `${WALRUS_AGGREGATOR}${checkpoint.blobId}`;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-cream">
            Checkpoint state
          </h2>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {checkpoint.id}
          </p>
        </div>
        <CopyButton
          text={JSON.stringify(checkpoint.state, null, 2)}
          label="Copy state"
        />
      </div>

      {/* Metadata grid */}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["node", checkpoint.node],
          ["step", String(checkpoint.step)],
          ["parent", checkpoint.parent ? checkpoint.shortId : "— (root)"],
          ["thread", threadId],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-ink-800/50 px-3 py-2.5">
            <dt className="text-[10px] uppercase tracking-wider text-slate-500">
              {k}
            </dt>
            <dd className="mt-0.5 truncate font-mono text-xs text-slate-200">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      {/* Walrus blob link */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-teal" fill="currentColor">
          <path d="M10 2a4 4 0 0 0-4 4v1H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm2 5H8V6a2 2 0 1 1 4 0v1Z" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-teal/80">
            Walrus blob id
          </p>
          <a
            href={aggregatorUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-mono text-xs text-slate-300 hover:text-teal"
            title={checkpoint.blobId}
          >
            {checkpoint.blobId}
          </a>
        </div>
        <CopyButton text={checkpoint.blobId} />
      </div>

      <p className="mt-5 mb-2 text-xs uppercase tracking-wider text-slate-500">
        channel_values
      </p>
      <JsonView value={checkpoint.state} />
    </div>
  );
}
