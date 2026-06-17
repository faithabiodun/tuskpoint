/**
 * The MCP clients TuskPoint plugs into, each paired with its real brand logo
 * (official SVGs in /public/logos, sourced from svgl.app). Entries without a
 * bundled logo fall back to a text label. Every client maps to a real config
 * in the `tuskpoint_info` tool and the /docs/clients page.
 *
 * `src` is a path under /public; `dark` marks logos whose native art is dark
 * (black/near-black) so the grid can sit them on a light chip to stay legible
 * on the deep-teal background.
 */
export type ClientLogo = {
  label: string;
  src?: string;
  dark?: boolean;
};

export const CLIENT_LOGOS: ClientLogo[] = [
  { label: "Claude", src: "/logos/claude.svg" },
  { label: "Gemini", src: "/logos/gemini.svg" },
  { label: "OpenAI Codex", src: "/logos/openai.svg", dark: true },
  { label: "Cursor", src: "/logos/cursor.svg", dark: true },
  { label: "Windsurf", src: "/logos/windsurf.svg", dark: true },
  { label: "VS Code", src: "/logos/vscode.svg" },
  { label: "GitHub Copilot", src: "/logos/copilot.svg", dark: true },
  { label: "Zed", src: "/logos/zed.svg", dark: true },
  // No bundled logo yet -> render the name as text (per design).
  { label: "Cline" },
  { label: "Continue" },
  { label: "Any MCP client" },
];
