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
        Every checkpoint blob is hashed with SHA-256 at write time, and that hash
        is recorded in the per-thread manifest. To verify a trail, TuskPoint
        re-fetches each blob, recomputes its SHA-256, and compares it to the
        stored hash. A match proves the bytes are byte-for-byte what was written;
        any mismatch is a <Code>FAIL</Code>. This is a cryptographic check, not
        merely a successful fetch — a blob that was swapped or corrupted in place
        is caught even if it still downloads.
      </P>
      <P>
        Each step is reported as <Code>PASS</Code> (hash matches),{" "}
        <Code>FAIL</Code> (hash differs — tampered), or <Code>UNVERIFIED</Code>{" "}
        (the checkpoint predates integrity proofs and carries no stored hash, so
        it can&apos;t be cryptographically confirmed).
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
  "tampered_count": 0,
  "steps": [
    {
      "checkpoint_id": "1f164eb8-…",
      "blob_id": "WL4TgZgqRE9Pwq1…",
      "stored_hash": "9e1c…",
      "recomputed_hash": "9e1c…",
      "status": "PASS"
    }
  ]
}`}
        />
      </div>

      <Callout title="ok only when every step passes and none are tampered">
        The top-level <Code>ok</Code> is <Code>true</Code> only when at least one
        checkpoint was hash-verified and <Code>tampered_count === 0</Code>. A
        single mismatched hash flips it to <Code>false</Code> and marks the
        offending step <Code>FAIL</Code> with its recomputed hash so you can see
        exactly what changed.
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
