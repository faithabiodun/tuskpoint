import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "TuskPoint — Verifiable LangGraph checkpoints on Walrus",
  description:
    "TuskPoint is a drop-in LangGraph checkpointer that stores agent state as immutable Walrus blobs, with semantic recall via MemWal and an MCP server exposing eight checkpoint tools.",
  keywords: [
    "Walrus",
    "LangGraph",
    "MCP",
    "checkpointer",
    "MemWal",
    "AI agents",
    "decentralized storage",
  ],
  authors: [{ name: "TuskPoint" }],
  icons: {
    icon: [{ url: "/icon.svg?v=3", type: "image/svg+xml" }],
    shortcut: ["/icon.svg?v=3"],
    apple: ["/icon.svg?v=3"],
  },
  openGraph: {
    title: "TuskPoint — Verifiable LangGraph checkpoints on Walrus",
    description:
      "Save agent state to a decentralized network. Survive a crash, rewind to any moment, and search your history in plain English.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
