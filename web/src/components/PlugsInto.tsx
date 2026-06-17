import Link from "next/link";
import { Reveal } from "./Reveal";
import { CopyButton } from "./CopyButton";
import { LogoGrid } from "./LogoGrid";

const ADD_COMMAND = "uvx tuskpoint-mcp";
const SETUP_COMMAND = "curl -sL https://tuskpoint.xyz/skills/setup";

export function PlugsInto() {
  return (
    <section id="plug-in" className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow-muted">Drop-in</p>
          <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
            Plugs into the tools you&apos;re already building with.
          </h2>
          <p className="mt-5 text-slate-400">
            One line wires TuskPoint into any MCP client.{" "}
            <code className="font-mono text-cream">uvx</code> fetches and runs it
            from PyPI, and all eleven tools show up in your agent. The config is
            the same shape everywhere; only the file location changes.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Rotating client grid: each tile cycles through the MCP clients and
              runtimes TuskPoint plugs into, so the same launcher visibly serves
              all of them. */}
          <Reveal>
            <LogoGrid />
          </Reveal>

          {/* One command */}
          <Reveal>
            <div className="rounded-2xl border border-line bg-ink-950/80 p-5 shadow-card">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                One command, no adapters
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-900/60 px-4 py-3">
                <code className="truncate font-mono text-sm text-slate-200">
                  <span className="text-flame">$ </span>
                  {ADD_COMMAND}
                </code>
                <CopyButton text={ADD_COMMAND} />
              </div>
              <p className="mt-4 text-sm text-slate-400">
                Prefer not to edit config by hand? Call the{" "}
                <code className="font-mono text-cream">tuskpoint_info</code>{" "}
                tool and your agent emits the right snippet for whatever client
                you&apos;re in, or fetch the whole setup as plain text:
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-900/60 px-4 py-3">
                <code className="truncate font-mono text-sm text-slate-200">
                  <span className="text-flame">$ </span>
                  {SETUP_COMMAND}
                </code>
                <CopyButton text={SETUP_COMMAND} />
              </div>
              <Link
                href="/docs/clients"
                className="btn-ghost mt-5 inline-flex"
              >
                Per-client setup
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
