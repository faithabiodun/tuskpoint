import Link from "next/link";
import { Hero } from "@/components/Hero";
import { ToolDirectory } from "@/components/ToolDirectory";
import { Architecture } from "@/components/Architecture";

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Tool directory */}
      <section id="tools" className="container-page py-20 sm:py-24">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="pill">MCP server · stdio</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Six checkpoint tools, any agent can call
            </h2>
            <p className="mt-3 text-slate-400">
              A complete checkpoint API over the Model Context Protocol — it
              complements, and never duplicates, MemWal&apos;s own MCP.
            </p>
          </div>
          <Link href="/docs" className="btn-ghost shrink-0">
            Read the docs
          </Link>
        </div>

        <ToolDirectory />
      </section>

      <Architecture />

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="card relative overflow-hidden px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-radial-teal" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              See it survive a crash
            </h2>
            <p className="mt-4 text-slate-400">
              Walk through a real researcher→writer run: inspect each checkpoint,
              diff two states, and search the run&apos;s history in plain English.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary w-full sm:w-auto">
                Open the dashboard
              </Link>
              <Link href="/docs" className="btn-ghost w-full sm:w-auto">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
