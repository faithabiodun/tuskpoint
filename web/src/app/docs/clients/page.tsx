import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, H3, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Connect a client",
  description:
    "Register the TuskPoint MCP server with Claude Desktop, Claude Code, Cursor, Windsurf, or any MCP client.",
};

const baseConfig = `{
  "mcpServers": {
    "tuskpoint": {
      "command": "python",
      "args": ["mcp_server/server.py"],
      "cwd": "/absolute/path/to/tuskpoint",
      "env": {
        "WALRUS_AGGREGATOR_URL": "https://aggregator.walrus-testnet.walrus.space",
        "WALRUS_PUBLISHER_URL": "https://publisher.walrus-testnet.walrus.space"
      }
    }
  }
}`;

// VS Code (GitHub Copilot agent mode) uses a top-level "servers" key with an
// explicit transport type, not "mcpServers".
const vscodeConfig = `{
  "servers": {
    "tuskpoint": {
      "type": "stdio",
      "command": "python",
      "args": ["mcp_server/server.py"],
      "cwd": "/absolute/path/to/tuskpoint"
    }
  }
}`;

// OpenAI Codex CLI is configured in TOML, not JSON.
const codexConfig = `[mcp_servers.tuskpoint]
command = "python"
args = ["mcp_server/server.py"]
cwd = "/absolute/path/to/tuskpoint"`;

export default function ClientsPage() {
  return (
    <>
      <DocTitle
        eyebrow="Reference"
        title="Connect a client"
        intro={
          <>
            TuskPoint speaks the Model Context Protocol over stdio, so any
            MCP-capable client can use all eleven tools. Pick your client below —
            the config is the same shape everywhere; only the file location
            changes.
          </>
        }
      />

      <Callout title="One block, every client">
        Most clients use the same{" "}
        <Code>{`{ "mcpServers": { "tuskpoint": { … } } }`}</Code> block (VS Code
        uses <Code>servers</Code>, and Codex CLI uses TOML — both shown below).
        Set <Code>cwd</Code> to the absolute path of your cloned repo so{" "}
        <Code>mcp_server/server.py</Code> resolves. Or just call the{" "}
        <Code>tuskpoint_info</Code> tool and let the agent emit the right snippet
        for you.
      </Callout>

      <H2 id="claude-desktop">Claude Desktop</H2>
      <P>
        Edit <Code>claude_desktop_config.json</Code> (Settings → Developer → Edit
        Config) and add the server, then restart Claude Desktop.
      </P>
      <div className="mt-4">
        <CodeBlock
          label="claude_desktop_config.json"
          lang="json"
          code={baseConfig}
        />
      </div>

      <H2 id="claude-code">Claude Code</H2>
      <P>
        Register it from the CLI in your repo root — no JSON editing required.
      </P>
      <div className="mt-4">
        <CodeBlock
          label="terminal"
          code={`claude mcp add tuskpoint -- python mcp_server/server.py`}
        />
      </div>
      <P>
        Then confirm it is wired up:
      </P>
      <div className="mt-4">
        <CodeBlock label="terminal" code={`claude mcp list`} />
      </div>

      <H2 id="cursor">Cursor</H2>
      <P>
        Create <Code>.cursor/mcp.json</Code> in your project (or the global{" "}
        <Code>~/.cursor/mcp.json</Code>) with the same block.
      </P>
      <div className="mt-4">
        <CodeBlock label=".cursor/mcp.json" lang="json" code={baseConfig} />
      </div>

      <H2 id="windsurf">Windsurf</H2>
      <P>
        Add the block to{" "}
        <Code>~/.codeium/windsurf/mcp_config.json</Code> and reload the MCP
        servers from the Cascade panel.
      </P>
      <div className="mt-4">
        <CodeBlock
          label="~/.codeium/windsurf/mcp_config.json"
          lang="json"
          code={baseConfig}
        />
      </div>

      <H2 id="vscode">VS Code (GitHub Copilot)</H2>
      <P>
        In Copilot agent mode, create <Code>.vscode/mcp.json</Code> in your
        workspace. VS Code uses a top-level <Code>servers</Code> key with an
        explicit <Code>type</Code>.
      </P>
      <div className="mt-4">
        <CodeBlock label=".vscode/mcp.json" lang="json" code={vscodeConfig} />
      </div>

      <H2 id="codex">OpenAI Codex CLI</H2>
      <P>
        Codex CLI is configured in TOML. Add a{" "}
        <Code>[mcp_servers.tuskpoint]</Code> table to{" "}
        <Code>~/.codex/config.toml</Code>.
      </P>
      <div className="mt-4">
        <CodeBlock label="~/.codex/config.toml" lang="toml" code={codexConfig} />
      </div>

      <H2 id="generic">Any other MCP client</H2>
      <P>
        A ready-to-use <Code>.mcp.json</Code> ships in the repo root. Point your
        client at it, or copy the block above. The transport is stdio and the
        command is always <Code>python mcp_server/server.py</Code>.
      </P>

      <H3>Optional: enable semantic search</H3>
      <P>
        To turn on <Code>checkpoint_search</Code>, add your MemWal credentials to
        the <Code>env</Code> block (or your <Code>.env</Code>):
      </P>
      <div className="mt-4">
        <CodeBlock
          label="env"
          code={`MEMWAL_PRIVATE_KEY=your_ed25519_delegate_key_hex
MEMWAL_ACCOUNT_ID=your_walrus_memory_account_object_id`}
        />
      </div>
      <Callout tone="amber" title="Free on testnet, funded on mainnet">
        The default is Walrus <Code>testnet</Code>, where{" "}
        <Code>checkpoint_save</Code> and <Code>checkpoint_fork</Code> work out of
        the box for free. To run on mainnet you need a publisher with a funded
        key — see{" "}
        <a href="/docs/mainnet" className="text-amber-300 underline-offset-4 hover:underline">
          the network guide
        </a>{" "}
        for the switch.
      </Callout>
    </>
  );
}
