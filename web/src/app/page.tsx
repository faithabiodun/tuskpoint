import Link from "next/link";
import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { Steps } from "@/components/Steps";
import { ProblemList } from "@/components/ProblemList";
import { RunEvidence } from "@/components/RunEvidence";
import { ToolDirectory } from "@/components/ToolDirectory";
import { Architecture } from "@/components/Architecture";
import { Comparison } from "@/components/Comparison";
import { Reveal } from "@/components/Reveal";

export default function HomePage() {
  return (
    <>
      <Hero />

      <Ticker />

      <ProblemList />

      <Steps />

      <RunEvidence />

      {/* Tool directory */}
      <section id="tools" className="border-t border-line py-20 sm:py-28">
        <div className="container-page">
          <Reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">
                <span className="status-dot" />
                MCP server · stdio
              </p>
              <h2 className="display-sm mt-5 text-display-sm font-extrabold tracking-tight text-cream">
                Eleven tools, any agent can call.
              </h2>
              <p className="mt-5 text-slate-400">
                A complete checkpoint API over the Model Context Protocol, it
                complements, and never duplicates, MemWal&apos;s own MCP.
              </p>
            </div>
            <Link href="/docs" className="btn-ghost shrink-0">
              Read the docs
            </Link>
          </Reveal>

          <ToolDirectory />
        </div>
      </section>

      <Architecture />

      <Comparison />

      <Ticker tone="flame" />

      {/* CTA */}
      <section className="border-t border-line py-24">
        <div className="container-tight text-center">
          <Reveal>
            <p className="eyebrow-muted justify-center">Try it</p>
            <h2 className="display mt-6 text-cream">
              See it survive
              <br />a crash.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-slate-400">
              Walk through a real researcher&nbsp;→&nbsp;writer run: inspect each
              checkpoint, diff two states, and search the run&apos;s history in
              plain English.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary w-full sm:w-auto">
                Open the run
              </Link>
              <Link href="/docs" className="btn-ghost w-full sm:w-auto">
                How it works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
