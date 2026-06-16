import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Rollback",
  description:
    "Restore an earlier checkpoint as the new head of the same thread, a durable, append-only undo.",
};

export default function RollbackPage() {
  return (
    <>
      <DocTitle
        eyebrow="Guides"
        title="Rollback"
        intro={
          <>
            <Code>rollback_to</Code> is a durable undo. It restores the state of
            an earlier checkpoint as the new head of the <em>same</em> thread, so
            the agent continues from a known-good moment, without erasing the
            steps in between.
          </>
        }
      />

      <H2 id="why">Why rollback?</H2>
      <P>
        Sometimes an agent walks itself into a bad state: a wrong tool result, a
        derailed plan, a corrupted intermediate. You want to go back to the last
        good checkpoint and continue from there. Rollback does exactly that, and
        because it stays on the same thread, the next <Code>resume</Code> picks
        up the restored state automatically.
      </P>

      <H2 id="how">How it works</H2>
      <P>
        Rollback reads the exact state at <Code>checkpoint_id</Code> and writes
        it back as a brand-new checkpoint at the head of the thread, parented off
        the previous head. The new head records{" "}
        <Code>rolled_back_from</Code> so the move is a visible, auditable step in
        the chain: the history reads <Code>... bad state</Code> {"->"}{" "}
        <Code>(rollback)</Code> {"->"} <Code>restored good state</Code>.
      </P>
      <Callout title="Append-only by design">
        Rollback never deletes the checkpoints it skips over. They stay on the
        thread, so the verifiable trail is intact and the rollback itself shows
        up as a step you can audit. The undo is durable and stays on the record.
      </Callout>

      <H2 id="vs-fork">Rollback vs. fork</H2>
      <P>
        Both start from an earlier checkpoint, but they go opposite directions.{" "}
        <Code>fork</Code> branches that state into a <em>new</em> thread and
        leaves the original untouched, good for exploring an alternative path
        side by side. <Code>rollback_to</Code> stays on the <em>same</em> thread
        and makes the restored state the new head, good for &quot;continue from
        here, the last bit was wrong.&quot;
      </P>

      <H2 id="mcp">Via the MCP tool</H2>
      <P>Any connected agent can roll a thread back with one call:</P>
      <div className="mt-4">
        <CodeBlock
          label="checkpoint_rollback"
          code={`checkpoint_rollback(
  thread_id="run-42",
  checkpoint_id="0c3b84d1-…",
)`}
        />
      </div>
      <P>It returns the new head and what it restored:</P>
      <div className="mt-4">
        <CodeBlock
          label="returns"
          lang="json"
          code={`{
  "thread_id": "run-42",
  "checkpoint_id": "8a91f0c2-…",
  "restored_from": "0c3b84d1-…",
  "blob_id": "WL4TgZgqRE9Pwq1UEclzBJu89KFaaLe75p004_9gJyw",
  "rolled_back_from": "0c3b84d1-…"
}`}
        />
      </div>

      <H2 id="python">Via the Python API</H2>
      <div className="mt-4">
        <CodeBlock
          label="python"
          code={`from langgraph_checkpoint_walrus import WalrusSaver, WalrusClient

saver = WalrusSaver(WalrusClient())
result = saver.rollback_to(
    thread_id="run-42",
    checkpoint_id="0c3b84d1-…",
)
print(result["restored_from"])  # 0c3b84d1-…

# The thread's head is now the restored state, resume continues from it.`}
        />
      </div>

      <Callout tone="amber" title="The checkpoint must exist on the thread">
        Rolling back to a <Code>checkpoint_id</Code> that isn&apos;t in the thread
        raises a clear error. The target is always an earlier checkpoint of the
        same thread.
      </Callout>
    </>
  );
}
