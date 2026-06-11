import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Quick start",
  description:
    "Install TuskPoint, prove a Walrus round-trip, and run the crash/resume demo.",
};

export default function QuickStartPage() {
  return (
    <>
      <DocTitle
        eyebrow="Getting started"
        title="Quick start"
        intro={
          <>
            Get from zero to a real crash-and-resume in a few commands. Every
            secret comes from environment variables — nothing is hard-coded.
          </>
        }
      />

      <H2 id="install">1. Install</H2>
      <P>
        Clone the repo and install the package with all optional extras (engine,
        MCP server, and demo agent).
      </P>
      <div className="mt-4 space-y-3">
        <CodeBlock
          label="install"
          code={`git clone https://github.com/faithabiodun/tuskpoint.git
cd tuskpoint
python -m pip install -e ".[all]"`}
        />
        <CodeBlock
          label="configure"
          code={`cp .env.example .env   # then fill in your keys`}
        />
      </div>
      <Callout title="What needs keys, and what doesn't">
        Reads from Walrus are public and free. Only writes (
        <Code>checkpoint_save</Code>, <Code>checkpoint_fork</Code>) need a
        publisher, and semantic search (<Code>checkpoint_search</Code>) needs
        MemWal credentials. The server runs without either — those tools return a
        clear message instead of failing.
      </Callout>

      <H2 id="prove">2. Prove the Walrus round-trip</H2>
      <P>
        This writes a tiny blob to a publisher and reads it back from an
        aggregator, confirming your endpoints work end-to-end.
      </P>
      <div className="mt-4">
        <CodeBlock label="round-trip" code={`python scripts/check_walrus.py`} />
      </div>

      <H2 id="demo">3. Run the crash / resume demo</H2>
      <P>
        The demo runs a small LangGraph research agent, persists each step to
        Walrus, then <span className="text-cream">exits the process</span>. A
        second, fresh process resumes from the last checkpoint — proving the
        state survived outside any single run.
      </P>
      <div className="mt-4 space-y-3">
        <CodeBlock
          label="part 1 — run, persist, EXIT"
          code={`python demo/run_demo.py --real --part1`}
        />
        <CodeBlock
          label="part 2 — fresh process resumes from Walrus"
          code={`python demo/run_demo.py --real --part2`}
        />
      </div>

      <H2 id="mcp">4. Start the MCP server</H2>
      <P>
        The same engine is exposed as an MCP server over stdio. Run it directly,
        or register it with a client (see{" "}
        <a href="/docs/clients" className="text-teal underline-offset-4 hover:underline">
          Connect a client
        </a>
        ).
      </P>
      <div className="mt-4">
        <CodeBlock label="mcp server" code={`python mcp_server/server.py`} />
      </div>

      <H2 id="next">Next steps</H2>
      <P>
        Browse the full tool reference, learn how fork &amp; replay works, or
        wire TuskPoint into Claude, Cursor, or Windsurf.
      </P>
    </>
  );
}
