import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Audit trail",
  description:
    "verify_trail walks a thread's blob chain to prove every checkpoint is intact and untampered.",
};

export default function AuditPage() {
  return (
    <>
      <DocTitle
        eyebrow="Guides"
        title="Audit trail"
        intro={
          <>
            <Code>verify_trail</Code> is the flight recorder. It walks a
            thread&apos;s entire chain of checkpoints and re-fetches each
            content-addressed blob, proving the run is intact and
            tamper-evident.
          </>
        }
      />

      <H2 id="why">Why it works</H2>
      <P>
        Walrus blob IDs are derived from content. If a single byte of a
        checkpoint changed, its blob ID would change too — so a stored ID can
        only ever return the exact bytes it was minted from. Verifying a trail is
        therefore a matter of re-fetching every blob in the manifest and
        confirming each one still fetches and unpacks cleanly.
      </P>

      <H2 id="run">Run it</H2>
      <div className="mt-4">
        <CodeBlock label="verify_trail" code={`verify_trail("run-42")`} />
      </div>
      <P>It returns a per-checkpoint report plus an overall verdict:</P>
      <div className="mt-4">
        <CodeBlock
          label="returns"
          lang="json"
          code={`{
  "thread_id": "run-42",
  "ok": true,
  "checkpoint_count": 4,
  "verified": 4,
  "steps": [
    {
      "checkpoint_id": "1f164eb8-…",
      "blob_id": "WL4TgZgqRE9Pwq1…",
      "parent": null,
      "forked_from": null,
      "ok": true,
      "error": null
    }
  ]
}`}
        />
      </div>

      <Callout title="ok only when every step passes">
        The top-level <Code>ok</Code> is <Code>true</Code> only when there is at
        least one checkpoint and <Code>verified === checkpoint_count</Code>. A
        single unreadable or corrupt blob flips it to <Code>false</Code> and
        marks the offending step with its <Code>error</Code>.
      </Callout>

      <H2 id="python">Via the Python API</H2>
      <div className="mt-4">
        <CodeBlock
          label="python"
          code={`from langgraph_checkpoint_walrus import WalrusSaver, WalrusClient

saver = WalrusSaver(WalrusClient())
report = saver.verify_trail("run-42")
assert report["ok"], "trail failed verification!"`}
        />
      </div>

      <H2 id="uses">What it&apos;s good for</H2>
      <ul className="mt-4 space-y-2 text-slate-400">
        <li>
          <span className="font-semibold text-cream">Compliance</span> — produce
          a verifiable record that an agent&apos;s decisions were not altered
          after the fact.
        </li>
        <li>
          <span className="font-semibold text-cream">Debugging</span> — catch a
          corrupt or missing checkpoint before it surfaces as a confusing resume
          failure.
        </li>
        <li>
          <span className="font-semibold text-cream">Hand-off</span> — let one
          agent verify another&apos;s trail before continuing from it.
        </li>
      </ul>
    </>
  );
}
