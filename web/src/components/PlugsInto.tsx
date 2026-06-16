import Link from "next/link";
import { Reveal } from "./Reveal";
import { CopyButton } from "./CopyButton";

// Clients that can drive TuskPoint. Every entry maps to a real config in the
// `tuskpoint_info` tool and the /docs/clients page, so nothing here is
// aspirational. The same stdio launcher (`uvx tuskpoint-mcp`) backs every
// client; only the config file location changes.
const CLIENTS: { label: string; note: string }[] = [
  { label: "Claude Code", note: "claude mcp add" },
  { label: "Claude Desktop", note: "claude_desktop_config.json" },
  { label: "Cursor", note: ".cursor/mcp.json" },
  { label: "Windsurf", note: "mcp_config.json" },
  { label: "VS Code (Copilot)", note: ".vscode/mcp.json" },
  { label: "OpenAI Codex CLI", note: "~/.codex/config.toml" },
  { label: "Any MCP client", note: ".mcp.json (native support)" },
];

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
          {/* Client list */}
          <Reveal>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {CLIENTS.map((c) => (
                <li
                  key={c.label}
                  className="flex items-baseline gap-2.5 rounded-xl border border-line bg-ink-950/40 px-4 py-3"
                >
                  <span className="text-flame">→</span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-cream">
                      {c.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {c.note}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
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
