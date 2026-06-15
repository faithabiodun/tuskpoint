import type { Metadata } from "next";
import { CodeBlock } from "@/components/CodeBlock";
import { DocTitle, H2, P, Callout, Code } from "../ui";

export const metadata: Metadata = {
  title: "Network: testnet & mainnet",
  description:
    "TuskPoint runs on Walrus testnet by default (free writes). How to switch to mainnet for durable, paid storage.",
};

export default function MainnetPage() {
  return (
    <>
      <DocTitle
        eyebrow="Guides"
        title="Network: testnet &amp; mainnet"
        intro={
          <>
            TuskPoint defaults to Walrus <span className="text-cream">testnet</span>,
            where writes are free and need no setup. Switch to{" "}
            <span className="text-cream">mainnet</span> for durable, paid storage
            whenever you are ready. Reads are public and free on either network.
          </>
        }
      />

      <H2 id="default">The default - testnet, free writes</H2>
      <P>
        Out of the box TuskPoint points at the public Walrus testnet endpoints.
        Testnet has a public, unauthenticated publisher, so you can save, fork,
        roll back, and hand off checkpoints without any wallet or tokens. These
        are the built-in defaults, you do not need to set anything:
      </P>
      <div className="mt-4">
        <CodeBlock
          label="env (testnet - the default)"
          code={`WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space`}
        />
      </div>

      <H2 id="switch">Switching to mainnet</H2>
      <P>
        When you want durable, paid storage, set both environment variables to
        the mainnet endpoints. They always take precedence over the testnet
        defaults:
      </P>
      <div className="mt-4">
        <CodeBlock
          label="env (mainnet)"
          code={`WALRUS_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space
WALRUS_PUBLISHER_URL=https://walrus-mainnet-publisher-1.staketab.org:443`}
        />
      </div>

      <H2 id="writes">Mainnet writes - need a publisher</H2>
      <P>
        Storing a blob on mainnet costs <Code>SUI</Code> (gas) plus{" "}
        <Code>WAL</Code> (storage), so there is{" "}
        <span className="text-cream">no public, unauthenticated publisher</span>.
        You have three options:
      </P>

      <ol className="mt-4 space-y-3 text-slate-400">
        <li>
          <span className="font-semibold text-cream">1. Community publisher</span>{" "}
          - quickest to try; may rate-limit or require an allowlist. This is the
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
          - recommended for production. Run the Walrus publisher with a funded
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
          - the mainnet relay at{" "}
          <Code>https://upload-relay.mainnet.walrus.space</Code> with a funded
          key.
        </li>
      </ol>

      <Callout title="Everything is env-overridable">
        <Code>WALRUS_PUBLISHER_URL</Code> and{" "}
        <Code>WALRUS_AGGREGATOR_URL</Code> always take precedence over the
        built-in testnet defaults. Reads work without any of the above, only
        writes (<Code>checkpoint_save</Code>, <Code>checkpoint_fork</Code>) need
        a publisher.
      </Callout>
    </>
  );
}
