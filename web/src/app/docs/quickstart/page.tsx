import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Quick start",
  description:
    "Add TuskPoint to any MCP client with one line: uvx tuskpoint-mcp. No clone, no config.",
};

export default function QuickStartPage() {
  return (
    <>
      <DocTitle
        eyebrow="Getting started"
        title="Quick start"
        intro={
          <>
            TuskPoint is a drop-in MCP plugin. One line wires it into your agent,
            no clone, no server to run, no paths to set, and all eleven tools
            show up.
          </>
        }
      />

      <H2 id="install">1. Add the plugin</H2>
      <P>
        <Code>uvx</Code> fetches and launches TuskPoint on demand, so there is
        nothing to install or keep running. In Claude Code it is a single
        command:
      </P>
      <div className="mt-4">
        <CodeBlock
          label="claude code"
          code={`claude mcp add tuskpoint -- uvx tuskpoint-mcp`}
        />
      </div>
      <P>
        For any other client, drop the same launcher into its MCP config (only
        the file location changes):
      </P>
      <div className="mt-4">
        <CodeBlock
          label="mcp config"
          lang="json"
          code={`{
  "mcpServers": {
    "tuskpoint": {
      "command": "uvx",
      "args": ["tuskpoint-mcp"]
    }
  }
}`}
        />
      </div>
      <P>
        See{" "}
        <a href="/docs/clients" className="text-flame underline-offset-4 hover:underline">
          Connect a client
        </a>{" "}
        for Claude Desktop, Cursor, Windsurf, VS Code, and Codex CLI, or call the{" "}
        <Code>tuskpoint_info</Code> tool and let the agent emit the right snippet.
      </P>
      <P>
        Prefer the terminal? Every config block above is also served as plain text
        at a single URL, so you (or an agent) can fetch the whole setup with one
        command:
      </P>
      <div className="mt-4">
        <CodeBlock
          label="terminal"
          code={`curl -sL https://tuskpoint.xyz/skills/setup`}
        />
      </div>

      <H2 id="keys">2. Keys, only when you need them</H2>
      <Callout title="What needs keys, and what doesn't">
        Reads from Walrus are public and free, so the plugin works out of the box
        on testnet. Writes (<Code>checkpoint_save</Code>,{" "}
        <Code>checkpoint_fork</Code>) need a publisher, and plain-English recall (
        <Code>checkpoint_search</Code>) runs on MemWal, so add those credentials
        to the <Code>env</Code> block to unlock them. Until you do, the server
        still starts and those tools return a clear message instead of failing.
      </Callout>

      <H2 id="live">3. See it live</H2>
      <P>
        Watch a real crash-and-resume, a diff, a rollback, and plain-English
        search on the{" "}
        <a href="/dashboard" className="text-flame underline-offset-4 hover:underline">
          live run dashboard
        </a>
        , every panel is a real Walrus round-trip, nothing mocked.
      </P>

      <H2 id="source">Run from source (contributors)</H2>
      <P>
        Want to hack on the engine itself? Clone and install with all extras. From
        a checkout the server also runs with{" "}
        <Code>python mcp_server/server.py</Code> (a thin shim around the packaged{" "}
        <Code>tuskpoint-mcp</Code> command).
      </P>
      <div className="mt-4">
        <CodeBlock
          label="from source"
          code={`git clone https://github.com/faithabiodun/tuskpoint.git
cd tuskpoint
python -m pip install -e ".[all]"
cp .env.example .env   # then fill in your keys`}
        />
      </div>

      <H2 id="next">Next steps</H2>
      <P>
        Browse the full tool reference, learn how fork &amp; replay works, or
        wire TuskPoint into Claude, Cursor, or Windsurf.
      </P>
    </>
  );
}
