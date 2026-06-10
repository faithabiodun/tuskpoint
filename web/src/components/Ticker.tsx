const ITEMS = [
  "IMMUTABLE BLOBS",
  "BYTE-EXACT READS",
  "REWIND TO ANY STEP",
  "SEMANTIC RECALL",
  "SURVIVES A CRASH",
  "6 MCP TOOLS",
  "WALRUS · LANGGRAPH · MEMWAL",
];

export function Ticker({ tone = "dark" }: { tone?: "dark" | "teal" }) {
  const base =
    tone === "teal"
      ? "bg-teal text-ink-950 border-teal"
      : "bg-ink-900 text-cream border-line";
  return (
    <div className={`overflow-hidden border-y ${base}`}>
      <div className="flex w-max animate-marquee whitespace-nowrap py-2.5">
        {[0, 1].map((dup) => (
          <ul
            key={dup}
            className="flex items-center"
            aria-hidden={dup === 1}
          >
            {ITEMS.map((t) => (
              <li
                key={t}
                className="flex items-center gap-3 px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]"
              >
                {t}
                <span className="text-base leading-none opacity-50">✺</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
