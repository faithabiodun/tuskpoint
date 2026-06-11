import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Walrus mainnet",
  description:
    "How TuskPoint reads and writes on Walrus mainnet, and the publisher options for writes.",
};

export default function MainnetPage() {
  return (
    <>
      <DocTitle
        eyebrow="Guides"
        title="Walrus mainnet"
        intro={
          <>
            TuskPoint defaults to Walrus <span className="text-cream">mainnet</span>.
            Reads are public and free; writes cost gas and need a publisher.
            Here is exactly what to set.
          </>
        }
      />

      <H2 id="reads">Reads — public and free</H2>
      <P>
        Any mainnet aggregator serves a content-addressed blob to anyone. The
        default aggregator is below; the engine falls back to community
        aggregators if it is unreachable.
      </P>
      <div className="mt-4">
        <CodeBlock
          label="env"
          code={`WALRUS_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space`}
        />
      </div>

      <H2 id="writes">Writes — need a publisher</H2>
      <P>
        Storing a blob on mainnet costs <Code>SUI</Code> (gas) plus{" "}
        <Code>WAL</Code> (storage), so there is{" "}
        <span className="text-cream">no public, unauthenticated publisher</span>.
        You have three options:
      </P>

      <ol className="mt-4 space-y-3 text-slate-400">
        <li>
          <span className="font-semibold text-cream">1. Community publisher</span>{" "}
          — quickest to try; may rate-limit or require an allowlist. This is the
          default in <Code>.env.example</Code>:
        </li>
      </ol>
      <div className="mt-3">
        <CodeBlock
          label="env"
          code={`WALRUS_PUBLISHER_URL=https://walrus-mainnet-publisher-1.staketab.org:443`}
        />
      </div>

      <ol start={2} className="mt-5 space-y-3 text-slate-400">
        <li>
          <span className="font-semibold text-cream">2. Run your own publisher</span>{" "}
          — recommended for production. Run the Walrus publisher with a funded
          Sui wallet and point <Code>WALRUS_PUBLISHER_URL</Code> at it.
        </li>
      </ol>
      <div className="mt-3">
        <CodeBlock
          label="terminal"
          code={`walrus publisher --sui-wallet <path-to-wallet> ...`}
        />
      </div>

      <ol start={3} className="mt-5 space-y-3 text-slate-400">
        <li>
          <span className="font-semibold text-cream">3. Use the upload relay</span>{" "}
          — the mainnet relay at{" "}
          <Code>https://upload-relay.mainnet.walrus.space</Code> with a funded
          key.
        </li>
      </ol>

      <Callout title="Everything is env-overridable">
        <Code>WALRUS_PUBLISHER_URL</Code> and{" "}
        <Code>WALRUS_AGGREGATOR_URL</Code> always take precedence over the
        built-in defaults. Reads work without any of the above — only writes (
        <Code>checkpoint_save</Code>, <Code>checkpoint_fork</Code>) need a
        publisher.
      </Callout>

      <H2 id="testnet">Falling back to testnet</H2>
      <P>
        To experiment without spending mainnet tokens, point both URLs at the
        public testnet endpoints:
      </P>
      <div className="mt-4">
        <CodeBlock
          label="env (testnet)"
          code={`WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space`}
        />
      </div>
    </>
  );
}
