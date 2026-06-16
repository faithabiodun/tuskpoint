import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Cross-agent handoff",
  description:
    "Hand a checkpoint to another agent or process, which re-fetches the blob and verifies it by hash before adopting it.",
};

export default function HandoffPage() {
  return (
    <>
      <DocTitle
        eyebrow="Guides"
        title="Cross-agent handoff"
        intro={
          <>
            <Code>handoff_checkpoint</Code> and <Code>adopt_checkpoint</Code> let
            one agent pass a run to another. The state crosses the boundary
            tamper-evidently: the receiver re-fetches the blob from Walrus and
            verifies its hash before it ever becomes state.
          </>
        }
      />

      <H2 id="why">Why hand off?</H2>
      <P>
        A planner finishes its part and a separate writer agent should take over.
        Or a run moves between two processes, two machines, even two teams.
        Because every checkpoint is already a content-addressed blob on Walrus,
        handing off doesn&apos;t copy any state. It just passes a small
        descriptor, the receiver pulls the real bytes itself.
      </P>

      <H2 id="how">How it works</H2>
      <P>
        <Code>handoff_checkpoint</Code> emits a portable descriptor: the{" "}
        <Code>blob_id</Code>, its <Code>blob_sha256</Code>, and provenance
        (source thread/checkpoint, optional <Code>to_agent</Code> label). The
        receiver calls <Code>adopt_checkpoint</Code>, which re-fetches that exact
        blob straight from Walrus, recomputes the SHA-256, and compares it to the
        sender&apos;s hash. On a match it writes the state as the genesis
        checkpoint of a new thread with an <Code>adopted_from</Code> lineage
        link. On a hash mismatch it refuses the adoption, since the blob was
        altered in transit.
      </P>
      <Callout title="The hash is the only thing trusted">
        The handoff travels as a public blob plus an integrity hash. The hash is
        the proof that what gets adopted is byte-for-byte what was handed off.
      </Callout>

      <H2 id="export">Step 1: export the handoff (sender)</H2>
      <div className="mt-4">
        <CodeBlock
          label="handoff_checkpoint"
          code={`handoff_checkpoint(
  thread_id="run-42",
  checkpoint_id="0c3b84d1-…",
  to_agent="writer",
)`}
        />
      </div>
      <P>It returns a descriptor you pass to the receiver as-is:</P>
      <div className="mt-4">
        <CodeBlock
          label="returns"
          lang="json"
          code={`{
  "source": "run-42:0c3b84d1-…",
  "thread_id": "run-42",
  "checkpoint_id": "0c3b84d1-…",
  "blob_id": "WL4TgZgqRE9Pwq1UEclzBJu89KFaaLe75p004_9gJyw",
  "blob_sha256": "e3b0c44298fc1c149afbf4c8996fb924…",
  "to_agent": "writer",
  "summary": "researcher gathered 3 sources"
}`}
        />
      </div>

      <H2 id="adopt">Step 2: adopt it (receiver)</H2>
      <P>
        The receiving agent passes the descriptor and a fresh thread id. Adopt
        re-fetches and verifies before writing anything:
      </P>
      <div className="mt-4">
        <CodeBlock
          label="adopt_checkpoint"
          code={`adopt_checkpoint(
  handoff_json={ /* the descriptor from step 1 */ },
  new_thread_id="run-42-writer",
)`}
        />
      </div>
      <div className="mt-4">
        <CodeBlock
          label="returns"
          lang="json"
          code={`{
  "adopted_from": "run-42:0c3b84d1-…",
  "new_thread_id": "run-42-writer",
  "checkpoint_id": "1f164ec0-…",
  "blob_id": "PsdXuRtdH0GiLO5R8rkqYTG7ZO_jQc8axU_mRiw3us4",
  "verified": true
}`}
        />
      </div>

      <H2 id="python">Via the Python API</H2>
      <div className="mt-4">
        <CodeBlock
          label="python"
          code={`from langgraph_checkpoint_walrus import WalrusSaver, WalrusClient

saver = WalrusSaver(WalrusClient())

# Sender:
descriptor = saver.handoff_checkpoint(
    thread_id="run-42",
    checkpoint_id="0c3b84d1-…",
    to_agent="writer",
)

# Receiver (could be a different process / machine):
result = saver.adopt_checkpoint(descriptor, new_thread_id="run-42-writer")
print(result["verified"])  # True`}
        />
      </div>

      <Callout tone="amber" title="Adopt into a fresh thread, integrity is enforced">
        <Code>adopt_checkpoint</Code> refuses a <Code>new_thread_id</Code> that
        already has checkpoints, and raises if the re-fetched blob fails the
        sender&apos;s hash. A tampered or substituted blob never becomes state.
      </Callout>
    </>
  );
}
