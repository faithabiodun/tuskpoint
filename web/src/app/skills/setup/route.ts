// Curl-able setup endpoint: `curl -sL https://tuskpoint.xyz/skills/setup`
//
// Mirrors the convention of memory.walrus.xyz/skills/setup: a single URL an
// agent or human can fetch to get ready-to-paste TuskPoint MCP setup. The
// content is TuskPoint-accurate, the one-line launcher is `uvx tuskpoint-mcp`
// (no clone, no cwd), and every config block matches what `tuskpoint_info`
// emits, so nothing here is aspirational.

export const runtime = "nodejs";
export const dynamic = "force-static";

const SETUP = `# TuskPoint MCP setup
# Verifiable LangGraph checkpoints on Walrus. 11 tools over stdio.
# Docs: https://tuskpoint.xyz/docs   Dashboard: https://tuskpoint.xyz/dashboard

## One line (Claude Code)
claude mcp add tuskpoint -- uvx tuskpoint-mcp

## Any other MCP client: drop this into your client's MCP config
## (only the file location changes; see notes below)
{
  "mcpServers": {
    "tuskpoint": {
      "command": "uvx",
      "args": ["tuskpoint-mcp"],
      "env": {
        "WALRUS_AGGREGATOR_URL": "https://aggregator.walrus-testnet.walrus.space",
        "WALRUS_PUBLISHER_URL": "https://publisher.walrus-testnet.walrus.space"
      }
    }
  }
}

## Config file location per client
#   Claude Desktop      claude_desktop_config.json
#   Cursor              .cursor/mcp.json
#   Windsurf            ~/.codeium/windsurf/mcp_config.json
#   VS Code (Copilot)   .vscode/mcp.json   (uses a "servers" key + "type": "stdio")
#   OpenAI Codex CLI    ~/.codex/config.toml   (TOML, see below)
#   Any MCP client      .mcp.json

## VS Code (GitHub Copilot) — .vscode/mcp.json
{
  "servers": {
    "tuskpoint": {
      "type": "stdio",
      "command": "uvx",
      "args": ["tuskpoint-mcp"]
    }
  }
}

## OpenAI Codex CLI — ~/.codex/config.toml
[mcp_servers.tuskpoint]
command = "uvx"
args = ["tuskpoint-mcp"]

## Notes
# - Transport is stdio. "uvx tuskpoint-mcp" fetches and runs the server; no clone, no cwd.
# - Reads from Walrus are public and free, so this works out of the box on testnet.
# - Writes (checkpoint_save, checkpoint_fork) need a publisher; semantic search
#   (checkpoint_search) needs MemWal. Set these in the "env" block or a .env:
#     MEMWAL_PRIVATE_KEY=<your ed25519 delegate key hex>
#     MEMWAL_ACCOUNT_ID=<your walrus memory account object id>
# - Mainnet: set WALRUS_PUBLISHER_URL / WALRUS_AGGREGATOR_URL to mainnet endpoints
#   (see https://tuskpoint.xyz/docs/mainnet).
# - Prefer not to edit config by hand? Call the tuskpoint_info tool and your agent
#   emits the right snippet for whatever client you're in.

## Tools (11 + tuskpoint_info)
#   checkpoint_save      Persist agent state as a new Walrus blob.
#   checkpoint_load      Load a specific (or latest) checkpoint by id.
#   checkpoint_list      List a thread's checkpoints, newest first.
#   checkpoint_resume    Return the latest state to continue a thread.
#   checkpoint_diff      Human-readable diff between two checkpoints.
#   checkpoint_search    Semantic recall over checkpoint summaries (MemWal).
#   checkpoint_fork      Branch a checkpoint into a new thread (replay a path).
#   checkpoint_rollback  Restore an earlier checkpoint as the new head (auditable undo).
#   handoff_checkpoint   Export a checkpoint descriptor for another agent to adopt.
#   adopt_checkpoint     Adopt a hash-verified handoff as a new thread's start.
#   verify_trail         Audit a thread's blob chain for tamper-evident integrity.
#   tuskpoint_info       Describe the server and emit client setup.
`;

export async function GET() {
  return new Response(SETUP, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
