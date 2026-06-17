import { Reveal } from "./Reveal";

const ROWS = [
  {
    capability: "Survives a process crash",
    inMemory: false,
    mutableDb: true,
    vectorOnly: false,
  },
  {
    capability: "Byte-exact, content-addressed reads",
    inMemory: false,
    mutableDb: false,
    vectorOnly: false,
  },
  {
    capability: "Rewind to any prior step",
    inMemory: false,
    mutableDb: true,
    vectorOnly: false,
  },
  {
    capability: "Tamper-evident history",
    inMemory: false,
    mutableDb: false,
    vectorOnly: false,
  },
  {
    capability: "Hand a run to another agent",
    inMemory: false,
    mutableDb: false,
    vectorOnly: false,
  },
  {
    capability: "Plain-English recall over history",
    inMemory: false,
    mutableDb: false,
    vectorOnly: true,
  },
  {
    capability: "One MCP any agent can call",
    inMemory: false,
    mutableDb: false,
    vectorOnly: false,
  },
];

function Cell({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-flame/15 text-flame">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        />
      </svg>
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-slate-600">
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
        <path d="M4 9h12v2H4z" />
      </svg>
    </span>
  );
}

export function Comparison() {
  return (
    <section className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow-muted">Why TuskPoint</p>
          <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
            Exact for trust. Semantic for discovery.
          </h2>
          <p className="mt-5 text-slate-400">
            Other approaches give you one or the other. TuskPoint keeps an
            immutable Walrus blob as the source of truth and treats vector recall
            as an index into it.
          </p>
        </Reveal>

        <Reveal className="mt-10 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="py-4 pr-3 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 sm:pr-4 sm:text-[11px] sm:tracking-[0.16em]">
                  Capability
                </th>
                <th className="px-3 py-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  In-memory
                </th>
                <th className="px-3 py-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  Mutable DB
                </th>
                <th className="px-3 py-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  Vector-only
                </th>
                <th className="px-3 py-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-flame">
                  TuskPoint
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr
                  key={r.capability}
                  className="border-b border-line transition hover:bg-ink-900/40"
                >
                  <td className="py-4 pr-4 text-sm font-medium text-cream">
                    {r.capability}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <Cell on={r.inMemory} />
                  </td>
                  <td className="px-3 py-4 text-center">
                    <Cell on={r.mutableDb} />
                  </td>
                  <td className="px-3 py-4 text-center">
                    <Cell on={r.vectorOnly} />
                  </td>
                  <td className="bg-flame/[0.04] px-3 py-4 text-center">
                    <Cell on={true} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
