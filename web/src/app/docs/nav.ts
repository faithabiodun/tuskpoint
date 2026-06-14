// Sidebar structure for the TuskPoint documentation site.
// Grouped sections, each with an ordered list of pages. Keeping this in one
// place lets the docs layout render the sidebar and the prev/next footer from a
// single source of truth.

export type DocLink = { href: string; label: string };
export type DocGroup = { title: string; links: DocLink[] };

export const DOC_NAV: DocGroup[] = [
  {
    title: "Getting started",
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/quickstart", label: "Quick start" },
      { href: "/docs/concepts", label: "Core concepts" },
    ],
  },
  {
    title: "Reference",
    links: [
      { href: "/docs/tools", label: "The eleven tools" },
      { href: "/docs/clients", label: "Connect a client" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: "/docs/fork", label: "Fork & replay" },
      { href: "/docs/audit", label: "Audit trail" },
      { href: "/docs/mainnet", label: "Network: testnet & mainnet" },
    ],
  },
];

// Flattened, ordered list used for prev/next navigation.
export const DOC_ORDER: DocLink[] = DOC_NAV.flatMap((g) => g.links);
