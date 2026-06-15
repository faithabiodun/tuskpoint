import type { Metadata } from "next";
import { TOOLS } from "@/lib/data";
import { DocTitle, H2, P, Code } from "../ui";

export const metadata: Metadata = {
  title: "The eleven tools",
  description:
    "Full reference for the TuskPoint MCP toolbelt: signatures, returns, and examples.",
};

const ORDER = ["Write", "Read", "Discover"] as const;
const GROUP_BLURB: Record<string, string> = {
  Write: "Persist, branch, roll back, or hand off a run.",
  Read: "Deterministic, content-addressed reads from Walrus.",
  Discover: "Find the right checkpoint in plain English.",
};

export default function ToolsPage() {
  return (
    <>
      <DocTitle
        eyebrow="Reference"
        title="The eleven tools"
        intro={
          <>
            Exposed over stdio by{" "}
            <Code>mcp_server/server.py</Code>. Plus a twelfth helper,{" "}
            <Code>tuskpoint_info</Code>, that returns ready-to-paste client
            configuration so an agent can wire itself up.
          </>
        }
      />

      {ORDER.map((cat) => {
        const tools = TOOLS.filter((t) => t.category === cat);
        if (tools.length === 0) return null;
        return (
          <section key={cat} className="mt-12 first:mt-0">
            <H2>{cat}</H2>
            <P>{GROUP_BLURB[cat]}</P>
            <div className="mt-5 space-y-3">
              {tools.map((t) => (
                <div key={t.name} className="card p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md border border-flame/30 bg-flame/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-flame">
                      {t.glyph}
                    </span>
                    <code className="font-mono text-sm font-semibold text-cream">
                      {t.signature}
                    </code>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {t.summary}
                  </p>
                  <div className="mt-3 space-y-1.5 font-mono text-xs">
                    <p className="text-slate-500">→ {t.returns}</p>
                    <p className="text-slate-400">
                      <span className="text-slate-600">e.g. </span>
                      {t.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12">
        <H2>tuskpoint_info</H2>
        <P>
          Calling <Code>tuskpoint_info</Code> returns the full tool list plus
          copy-paste MCP config for Claude Desktop, Claude Code, Cursor,
          Windsurf, and the generic <Code>.mcp.json</Code> form, so an agent can
          discover how to connect without leaving the chat.
        </P>
      </section>
    </>
  );
}
