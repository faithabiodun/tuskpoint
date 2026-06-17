/**
 * Brand marks for the MCP clients TuskPoint plugs into, drawn inline as SVG so
 * they scale crisply with no external asset requests and never 404. Each is a
 * simplified, recognizable rendition of the product's logo in a single
 * currentColor-friendly form; sized by the caller via className.
 */
import type { ReactNode } from "react";

type IconProps = { className?: string };

// Anthropic / Claude — the radial "sunburst" mark.
function Claude({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#D97757" aria-hidden>
      <path d="M4.7 15.5 8.9 4.6h2.3l4.2 10.9h-2.2l-.86-2.36H7.7l-.86 2.36H4.7Zm3.6-4.2h3.1L10 7.0l-1.7 4.3Z" />
      <path d="M13.1 15.5 17.3 4.6h2.3l-4.2 10.9h-2.3Z" opacity="0.85" />
    </svg>
  );
}

// Google Gemini — the four-point spark.
function Gemini({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="gem-g" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#4796E3" />
          <stop offset="50%" stopColor="#9177C7" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 1c.4 5.6 4.4 9.6 10 10-5.6.4-9.6 4.4-10 10-.4-5.6-4.4-9.6-10-10C7.6 10.6 11.6 6.6 12 1Z"
        fill="url(#gem-g)"
      />
    </svg>
  );
}

// Cursor — the layered cube/cursor wedge.
function Cursor({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" fill="#0F0F0F" stroke="#E4E4E4" strokeWidth="0.6" />
      <path d="M12 2v20l9-5V7l-9-5Z" fill="#3D3D3D" />
      <path d="M3 7l9 5 9-5" fill="none" stroke="#9b9b9b" strokeWidth="0.8" />
      <path d="M12 12v10" stroke="#9b9b9b" strokeWidth="0.8" />
    </svg>
  );
}

// Windsurf — Codeium's wind/wing arc.
function Windsurf({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M3 16c4-1 7-3 9-6 1.6-2.4 3.6-4 6-4.5-1 3.2-2.4 5.7-4.4 7.6C11.2 16 7.3 17.3 3 16Z"
        fill="#09B6A2"
      />
      <path d="M4 19c5 .8 9.5-.4 13-3.4-2.7 4-7 5.7-13 3.4Z" fill="#0A1B1A" opacity="0.45" />
    </svg>
  );
}

// VS Code — the blue ribbon mark.
function VSCode({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M17.5 2.3 9.4 9.8 5 6.4 2.6 7.6 6.3 12l-3.7 4.4L5 17.6l4.4-3.4 8.1 7.5L22 19.6V4.4L17.5 2.3Zm.4 4.1v11.2L11.2 12l6.7-5.6Z"
        fill="#2EA9E0"
      />
    </svg>
  );
}

// OpenAI Codex — the OpenAI knot.
function Codex({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#10A37F" aria-hidden>
      <path d="M21.3 9.9a5.4 5.4 0 0 0-.5-4.5 5.5 5.5 0 0 0-5.9-2.6A5.4 5.4 0 0 0 6 3.7a5.4 5.4 0 0 0-3.6 2.6 5.5 5.5 0 0 0 .7 6.4 5.4 5.4 0 0 0 .5 4.5 5.5 5.5 0 0 0 5.9 2.6 5.4 5.4 0 0 0 8.9-1.3 5.4 5.4 0 0 0 3.6-2.6 5.5 5.5 0 0 0-.7-6.4Zm-8 11.2a4 4 0 0 1-2.6-.9l3.5-2 .5-.3v-4.9l1.5.9v4a4 4 0 0 1-4 3.2h-.4Zm-8.6-3.7a4 4 0 0 1-.5-2.7l3.5 2 .5.3 4.3-2.5v1.8l-3.6 2.1a4 4 0 0 1-5.5-1.5l.8.5Zm-1-8a4 4 0 0 1 2.1-1.8v4.6l4.3 2.5-1.5.9-3.6-2.1a4 4 0 0 1-1.3-4.1Zm14.8 3.4-4.3-2.5 1.5-.9 3.6 2.1a4 4 0 0 1-.6 7.2v-4.6l-.2-1.3Zm1.5-2.2-3.5-2-.5-.3-4.3 2.5V8.6l3.6-2.1a4 4 0 0 1 5.9 4.1l-.7-.8Zm-9.3 3-1.5-.9V9.8a4 4 0 0 1 .9-.4l4.3 2.5v3l-3.6 2-.5-2.3Z" />
    </svg>
  );
}

// Zed — the bracketed Z.
function Zed({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="#0B0B0F" stroke="#3b3b44" strokeWidth="0.7" />
      <path d="M7 7h10l-7 7h6v3H6l7-7H7V7Z" fill="#6E63E5" />
    </svg>
  );
}

// Cline — terminal bracket.
function Cline({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2.5" y="3.5" width="19" height="17" rx="3.5" fill="#101316" stroke="#2f3a3a" strokeWidth="0.7" />
      <path d="M7 9l3 3-3 3" fill="none" stroke="#2fd4c0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 15.5h4.5" stroke="#2fd4c0" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Continue — the continue ">" chevrons.
function Continue({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#0E0E0E" stroke="#3a3a3a" strokeWidth="0.7" />
      <path d="M8 8l4 4-4 4M13 12h3" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Generic MCP plug — for "any MCP client".
function AnyMCP({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="#2fd4c0" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2.4" fill="#2fd4c0" />
      <g stroke="#2fd4c0" strokeWidth="1.4" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="7" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="3" y1="12" x2="7" y2="12" />
        <line x1="17" y1="12" x2="21" y2="12" />
      </g>
    </svg>
  );
}

export type ClientLogo = { label: string; Icon: (p: IconProps) => ReactNode };

// AI coding clients / agents only (no stack items). Each maps to a real config
// in the `tuskpoint_info` tool and the /docs/clients page.
export const CLIENT_LOGOS: ClientLogo[] = [
  { label: "Claude Code", Icon: Claude },
  { label: "Claude Desktop", Icon: Claude },
  { label: "Gemini CLI", Icon: Gemini },
  { label: "Cursor", Icon: Cursor },
  { label: "Windsurf", Icon: Windsurf },
  { label: "VS Code", Icon: VSCode },
  { label: "Codex CLI", Icon: Codex },
  { label: "Zed", Icon: Zed },
  { label: "Cline", Icon: Cline },
  { label: "Continue", Icon: Continue },
  { label: "Any MCP client", Icon: AnyMCP },
];
