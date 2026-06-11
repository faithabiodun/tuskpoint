import type { Metadata } from "next";
import { DocsSidebar } from "./DocsSidebar";
import { DocsPager } from "./DocsPager";

export const metadata: Metadata = {
  title: {
    default: "Docs — TuskPoint",
    template: "%s — TuskPoint Docs",
  },
  description:
    "Documentation for TuskPoint: a Walrus-backed LangGraph checkpointer with semantic recall, fork & replay, audit trails, and an all-in-one MCP server.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[230px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <DocsSidebar />
        </div>
      </aside>

      <div className="min-w-0">
        <article className="max-w-3xl">{children}</article>
        <div className="max-w-3xl">
          <DocsPager />
        </div>
      </div>
    </div>
  );
}
