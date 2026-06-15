import type { Metadata } from "next";
import { DocTitle, H2, H3, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Core concepts",
  description:
    "Checkpoints, blobs, manifests, threads, forks, and the exact-vs-semantic split.",
};

export default function ConceptsPage() {
  return (
    <>
      <DocTitle
        eyebrow="Getting started"
        title="Core concepts"
        intro={
          <>
            A short vocabulary that the rest of the docs builds on. Five nouns
            and one rule.
          </>
        }
      />

      <H2 id="checkpoint">Checkpoint</H2>
      <P>
        A snapshot of an agent&apos;s state at one moment, the LangGraph channel
        values plus metadata and lineage. TuskPoint serializes a checkpoint,
        gzips it, and stores the result as a single Walrus blob.
      </P>

      <H2 id="blob">Blob</H2>
      <P>
        The unit Walrus stores. Blobs are{" "}
        <span className="text-cream">content-addressed</span>: the blob ID is
        derived from the bytes, so a given ID can only ever return those exact
        bytes. That is what makes a read verifiable and an audit possible.
      </P>

      <H2 id="manifest">Manifest</H2>
      <P>
        A per-thread index mapping each <Code>checkpoint_id</Code> to its{" "}
        <Code>CheckpointEntry</Code>: the blob ID, the parent checkpoint,
        timestamp, summary, and (for forks) a <Code>forked_from</Code> pointer.
        The manifest is itself serialized to JSON and stored as a Walrus blob,
        re-uploaded on every save. The latest manifest blob ID per thread is
        cached locally so lookups are fast.
      </P>
      <Callout title="Why lexical sort = chronological order">
        LangGraph checkpoint IDs are time-ordered UUIDv6 strings, so the lexical
        maximum of the IDs is the chronologically latest checkpoint. TuskPoint
        relies on that for &quot;latest&quot; lookups, no extra timestamp index
        needed.
      </Callout>

      <H2 id="thread">Thread</H2>
      <P>
        A single line (or tree) of checkpoints, one agent run. A thread is
        identified by a <Code>thread_id</Code> and indexed by exactly one
        manifest. Resuming a thread loads its latest checkpoint.
      </P>

      <H2 id="fork">Fork</H2>
      <P>
        A new thread whose genesis checkpoint is copied from another
        thread&apos;s checkpoint, with a <Code>forked_from</Code> lineage record.
        Forking lets you replay from a known-good point and try a different path
        without disturbing the original, the manifest can describe a{" "}
        <span className="text-cream">tree of runs</span>, not just a line.
      </P>

      <H2 id="rule">The one rule: exact vs. semantic</H2>
      <H3>Exact lookups are by ID, never fuzzy</H3>
      <P>
        <Code>checkpoint_load</Code> resolves the manifest entry → blob ID →
        Walrus GET → de-gzip → de-serialize. The blob you read is byte-for-byte
        the blob you wrote. This is the part you rewind to.
      </P>
      <H3>Semantic search is for discovery</H3>
      <P>
        <Code>checkpoint_search</Code> asks MemWal for the nearest summaries,
        pointers that carry checkpoint IDs, which you then load exactly. Vector
        recall is an index into the exact store, never the source of truth.
      </P>

      <Callout title="How TuskPoint uses MemWal">
        MemWal is the semantic memory layer TuskPoint builds on. TuskPoint writes
        a one-line summary of each checkpoint to MemWal, then{" "}
        <Code>checkpoint_search</Code> uses MemWal&apos;s recall to find the right
        moment. The result is a pointer you load exactly from Walrus, so semantic
        recall handles discovery and the content-addressed blob is still the
        source of truth.
      </Callout>
    </>
  );
}
