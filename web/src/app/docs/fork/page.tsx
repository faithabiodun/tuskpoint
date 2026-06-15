import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Fork & replay",
  description:
    "Branch any checkpoint into a new thread to explore a different path, git for agent runs.",
};

export default function ForkPage() {
  return (
    <>
      <DocTitle
        eyebrow="Guides"
        title="Fork & replay"
        intro={
          <>
            <Code>checkpoint_fork</Code> is the &quot;git branch&quot; for agent
            runs. Copy any checkpoint into a brand-new thread, then run a
            different path from there, the original thread is never touched.
          </>
        }
      />

      <H2 id="why">Why fork?</H2>
      <P>
        Agents make irreversible choices: a tool call, a model, a prompt
        strategy. When you want to compare two paths from the same starting
        point - A/B a planner, retry after a bad branch, or hand a known-good
        state to a different agent - you fork. Because every checkpoint is a
        content-addressed blob, forking is nearly free: it writes one new genesis
        checkpoint that points back at where it came from.
      </P>

      <H2 id="how">How it works</H2>
      <P>
        Fork loads the exact state at{" "}
        <Code>source_checkpoint_id</Code>, writes it as the genesis checkpoint of{" "}
        <Code>new_thread_id</Code>, and records a{" "}
        <Code>forked_from = &quot;{`{source_thread}:{source_checkpoint}`}&quot;</Code>{" "}
        lineage in the new thread&apos;s manifest. The new thread then evolves
        independently.
      </P>
      <Callout title="Genesis, not a copy of history">
        A fork creates a new thread whose <em>first</em> checkpoint equals the
        source state. It does not duplicate the source thread&apos;s entire
        history, the lineage pointer is enough to trace where it branched from.
      </Callout>

      <H2 id="mcp">Via the MCP tool</H2>
      <P>Any connected agent can fork with one call:</P>
      <div className="mt-4">
        <CodeBlock
          label="checkpoint_fork"
          code={`checkpoint_fork(
  source_thread_id="run-42",
  source_checkpoint_id="0c3b84d1-…",
  new_thread_id="run-42-alt",
)`}
        />
      </div>
      <P>It returns the new genesis checkpoint and its lineage:</P>
      <div className="mt-4">
        <CodeBlock
          label="returns"
          lang="json"
          code={`{
  "source": "run-42:0c3b84d1-…",
  "new_thread_id": "run-42-alt",
  "checkpoint_id": "1f164ec0-…",
  "blob_id": "WL4TgZgqRE9Pwq1UEclzBJu89KFaaLe75p004_9gJyw",
  "forked_from": "run-42:0c3b84d1-…"
}`}
        />
      </div>

      <H2 id="python">Via the Python API</H2>
      <div className="mt-4">
        <CodeBlock
          label="python"
          code={`from langgraph_checkpoint_walrus import WalrusSaver, WalrusClient

saver = WalrusSaver(WalrusClient())
result = saver.fork(
    source_thread_id="run-42",
    source_checkpoint_id="0c3b84d1-…",
    new_thread_id="run-42-alt",
)
print(result["forked_from"])  # run-42:0c3b84d1-…`}
        />
      </div>

      <Callout tone="amber" title="The target thread must be empty">
        Fork refuses to write into a thread that already has checkpoints, that
        would overwrite real history. Pick a fresh <Code>new_thread_id</Code>.
        Loading a missing source checkpoint raises a clear error too.
      </Callout>
    </>
  );
}
