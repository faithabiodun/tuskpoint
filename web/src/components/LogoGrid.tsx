import { CLIENT_LOGOS, type ClientLogo } from "./ClientLogos";

// A single client chip: real brand logo when we have one, otherwise the name as
// text. Dark-art logos sit on a light chip so they stay legible on the deep
// teal background; the rest sit on the standard line/ink chip.
function Chip({ c }: { c: ClientLogo }) {
  return (
    <div className="mx-2 flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-ink-950/50 px-5 py-3.5 transition-colors hover:border-flame/40 hover:bg-ink-900/60">
      {c.src ? (
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            c.dark ? "bg-white/90 p-1.5" : "p-0.5"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.src}
            alt={`${c.label} logo`}
            className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </span>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-flame/25 bg-flame/10 font-mono text-[11px] font-bold text-flame">
          {c.label.slice(0, 2)}
        </span>
      )}
      <span className="whitespace-nowrap text-sm font-semibold text-cream">
        {c.label}
      </span>
    </div>
  );
}

// One marquee row. `items` is duplicated so the -50% translate loops seamlessly.
function Row({
  items,
  reverse = false,
}: {
  items: ClientLogo[];
  reverse?: boolean;
}) {
  return (
    <div className="flex overflow-hidden">
      <div
        className={`flex w-max ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}
      >
        {[0, 1].map((dup) => (
          <div className="flex" key={dup} aria-hidden={dup === 1}>
            {items.map((c, i) => (
              <Chip c={c} key={`${dup}-${c.label}-${i}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Two continuously scrolling rows (opposite directions), like the "deploy
// anything" logo wall: every MCP client TuskPoint plugs into drifts past.
export function LogoGrid() {
  const half = Math.ceil(CLIENT_LOGOS.length / 2);
  const top = CLIENT_LOGOS.slice(0, half);
  const bottom = CLIENT_LOGOS.slice(half);
  return (
    <div
      className="flex flex-col gap-3"
      aria-label="MCP clients TuskPoint plugs into"
    >
      <Row items={top} />
      <Row items={bottom} reverse />
    </div>
  );
}
