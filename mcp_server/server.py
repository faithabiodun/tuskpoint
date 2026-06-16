"""Thin shim kept for source checkouts and existing client configs.

The TuskPoint MCP server now lives inside the installed package at
``langgraph_checkpoint_walrus.mcp_server`` so it can ship in the wheel and be
launched as a plugin with ``uvx tuskpoint-mcp`` (no clone, no cwd).

Running ``python mcp_server/server.py`` from a checkout still works and simply
delegates to the packaged entry point.
"""

from langgraph_checkpoint_walrus.mcp_server import main

if __name__ == "__main__":
    main()
