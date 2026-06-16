// Hand-drawn (Excalidraw-esque) diagram generator for TuskPoint.
// Produces sketchy SVGs with wobbly strokes + a hand-drawn font, then renders
// each to PNG via headless Edge/Chromium. No external deps.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = __dirname;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// ---- palette (warm "tusk" theme: cream paper, flame/teal accents) ----
const C = {
  paper: "#fbf8f1",
  ink: "#2b2622",
  sub: "#6b6258",
  line: "#3a342e",
  flame: "#e2683c",   // primary accent
  flameFill: "#fbe3d6",
  teal: "#2f9c8f",    // walrus/storage
  tealFill: "#d8efe9",
  blue: "#3b6ea5",    // memwal
  blueFill: "#dde8f3",
  amber: "#caa23b",
  amberFill: "#fbeecb",
  yellow: "#e0a93b",
  yellowFill: "#fbeecb",
  red: "#c8483a",
  redFill: "#f7dcd7",
  green: "#3f8f4f",
  greenFill: "#dcefdd",
  grayFill: "#ece7df",
};

// deterministic jitter so output is stable run-to-run
let _seed = 7;
function rnd() { _seed = (_seed * 9301 + 49297) % 233280; return _seed / 233280; }
function j(n) { return (rnd() - 0.5) * n; }

// A wobbly hand-drawn line (two offset passes for the sketch look).
function roughLine(x1, y1, x2, y2, stroke = C.line, w = 2.2) {
  const segs = [];
  for (let pass = 0; pass < 2; pass++) {
    const k = 1.6;
    const mx = (x1 + x2) / 2 + j(k * 4);
    const my = (y1 + y2) / 2 + j(k * 4);
    segs.push(
      `<path d="M ${x1 + j(k)} ${y1 + j(k)} Q ${mx} ${my} ${x2 + j(k)} ${y2 + j(k)}" ` +
      `fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" opacity="${pass ? 0.55 : 1}"/>`
    );
  }
  return segs.join("");
}

// A wobbly rounded rectangle drawn as a rough closed path.
function roughRect(x, y, w, h, { stroke = C.line, fill = "none", sw = 2.4, r = 14 } = {}) {
  // fill first (soft, slightly inset) then sketchy outline
  let s = "";
  if (fill !== "none") {
    s += `<rect x="${x + 2}" y="${y + 3}" width="${w - 4}" height="${h - 4}" rx="${r}" fill="${fill}" opacity="0.9"/>`;
  }
  const pts = [
    [x + r, y], [x + w - r, y],
    [x + w, y + r], [x + w, y + h - r],
    [x + w - r, y + h], [x + r, y + h],
    [x, y + h - r], [x, y + r],
  ];
  for (let pass = 0; pass < 2; pass++) {
    let d = `M ${pts[0][0] + j(1.4)} ${pts[0][1] + j(1.4)} `;
    d += `L ${pts[1][0] + j(1.4)} ${pts[1][1] + j(1.4)} `;
    d += `Q ${x + w + j(1.2)} ${y + j(1.2)} ${pts[2][0] + j(1.4)} ${pts[2][1] + j(1.4)} `;
    d += `L ${pts[3][0] + j(1.4)} ${pts[3][1] + j(1.4)} `;
    d += `Q ${x + w + j(1.2)} ${y + h + j(1.2)} ${pts[4][0] + j(1.4)} ${pts[4][1] + j(1.4)} `;
    d += `L ${pts[5][0] + j(1.4)} ${pts[5][1] + j(1.4)} `;
    d += `Q ${x + j(1.2)} ${y + h + j(1.2)} ${pts[6][0] + j(1.4)} ${pts[6][1] + j(1.4)} `;
    d += `L ${pts[7][0] + j(1.4)} ${pts[7][1] + j(1.4)} `;
    d += `Q ${x + j(1.2)} ${y + j(1.2)} ${pts[0][0] + j(1.4)} ${pts[0][1] + j(1.4)} Z`;
    s += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" opacity="${pass ? 0.5 : 1}"/>`;
  }
  return s;
}

function arrow(x1, y1, x2, y2, { stroke = C.line, w = 2.4, dashed = false } = {}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = 13;
  const a1x = x2 - ah * Math.cos(ang - 0.45), a1y = y2 - ah * Math.sin(ang - 0.45);
  const a2x = x2 - ah * Math.cos(ang + 0.45), a2y = y2 - ah * Math.sin(ang + 0.45);
  const dash = dashed ? `stroke-dasharray="2 7"` : "";
  let s = `<path d="M ${x1} ${y1} Q ${(x1 + x2) / 2 + j(5)} ${(y1 + y2) / 2 + j(5)} ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${dash}/>`;
  s += roughLine(x2, y2, a1x, a1y, stroke, w);
  s += roughLine(x2, y2, a2x, a2y, stroke, w);
  return s;
}

function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function text(x, y, t, { size = 22, fill = C.ink, anchor = "middle", weight = "normal", mono = false, italic = false } = {}) {
  const fam = mono ? "'Cascadia Code','Consolas',monospace" : "'Segoe Print','Ink Free','Comic Sans MS',cursive";
  const st = italic ? "italic" : "normal";
  return `<text x="${x}" y="${y}" font-family="${fam}" font-size="${size}" font-style="${st}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`;
}

// multi-line centered label inside a box
function lines(cx, cy, arr, opt = {}) {
  const size = opt.size || 21;
  const lh = opt.lh || size * 1.32;
  const start = cy - ((arr.length - 1) * lh) / 2;
  return arr.map((ln, i) => {
    const o = typeof ln === "string" ? { t: ln } : ln;
    return text(cx, start + i * lh + size * 0.34, o.t, { size: o.size || size, fill: o.fill || opt.fill || C.ink, weight: o.weight || opt.weight || "normal", mono: o.mono, anchor: "middle" });
  }).join("");
}

function svg(w, h, body, title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.018 0"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.paper}"/>
  <rect width="${w}" height="${h}" filter="url(#paper)"/>
  ${module.exports._noMarks ? "" : (module.exports.tuskMark ? module.exports.tuskMark(70, 52, 1.25) : "")}
  ${title ? text(module.exports._noMarks ? 60 : 108, 64, title, { size: 38, anchor: "start", weight: "bold", fill: C.ink }) : ""}
  ${subtitle ? text(module.exports._noMarks ? 62 : 110, 98, subtitle, { size: 21, anchor: "start", fill: C.sub, italic: true }) : ""}
  ${body}
  ${module.exports._noMarks ? "" : (module.exports.tuskMark ? module.exports.tuskMark(w - 232, h - 22, 0.85) : "")}
  ${text(w - 40, h - 26, "TuskPoint", { size: 20, anchor: "end", fill: C.flame, weight: "bold" })}
  ${text(w - 40, h - 6, "verifiable LangGraph checkpoints on Walrus", { size: 13, anchor: "end", fill: C.sub })}
</svg>`;
}

// small caption pill on an arrow
function tag(x, y, t, fill = C.paper) {
  const w = t.length * 9.5 + 16;
  return `<rect x="${x - w / 2}" y="${y - 15}" width="${w}" height="26" rx="8" fill="${fill}" stroke="${C.sub}" stroke-width="1.2" opacity="0.96"/>` +
    text(x, y + 4, t, { size: 16, fill: C.sub });
}

// ---- brand marks (compact, recognizable, on-brand colors) ----------------
// The real TuskPoint tusk mark (simplified from web/public/logo.svg).
function tuskMark(cx, cy, s = 1) {
  return `<g transform="translate(${cx},${cy}) scale(${s})">
    <circle cx="8" cy="2" r="22" fill="#0fb3a1" opacity="0.16"/>
    <path d="M -22 -6 C -17 -15, 4 -17, 15 -6 C 20 -1, 22 4, 23 8"
      fill="none" stroke="#cdbf9c" stroke-width="6.5" stroke-linecap="round"/>
    <path d="M 11 -7 C 17 -1, 21 3, 23 8" fill="none" stroke="#48ddca"
      stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1.2 3.5"/>
    <circle cx="23" cy="8" r="6.4" fill="#2fd4c0"/>
    <circle cx="21.5" cy="6.5" r="1.7" fill="#fff" opacity="0.95"/>
  </g>`;
}
// Walrus: rounded teal tile with a simple tusked-whiskered glyph + wordmark.
function walrusMark(cx, cy, s = 1) {
  return `<g transform="translate(${cx},${cy}) scale(${s})">
    <rect x="-20" y="-20" width="40" height="40" rx="11" fill="#0fb3a1"/>
    <circle cx="-6" cy="-3" r="3.6" fill="#fff"/><circle cx="6" cy="-3" r="3.6" fill="#fff"/>
    <circle cx="-6" cy="-3" r="1.5" fill="#0fb3a1"/><circle cx="6" cy="-3" r="1.5" fill="#0fb3a1"/>
    <path d="M -3 5 C -2 8, 2 8, 3 5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M -3 6 L -4 13 M 3 6 L 4 13" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}
// MemWal: rounded blue tile with a "brain/recall" spark glyph.
function memwalMark(cx, cy, s = 1) {
  return `<g transform="translate(${cx},${cy}) scale(${s})">
    <rect x="-20" y="-20" width="40" height="40" rx="11" fill="#3b6ea5"/>
    <path d="M -8 -7 C -15 -7, -15 3, -8 4 C -10 11, 0 13, 2 7 C 10 9, 12 -2, 4 -4 C 5 -12, -5 -13, -8 -7 Z"
      fill="none" stroke="#fff" stroke-width="2.2"/>
    <path d="M 0 -4 L -3 1 L 1 1 L -2 6" fill="none" stroke="#ffd76b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}
// Sui: rounded deep-blue tile with the signature water-drop glyph.
function suiMark(cx, cy, s = 1) {
  return `<g transform="translate(${cx},${cy}) scale(${s})">
    <rect x="-20" y="-20" width="40" height="40" rx="11" fill="#4da2ff"/>
    <path d="M 0 -13 C 9 -2, 12 4, 12 9 A 12 12 0 1 1 -12 9 C -12 4, -9 -2, 0 -13 Z"
      fill="#fff"/>
    <path d="M -6 6 C -6 12, 6 12, 6 5" fill="none" stroke="#4da2ff" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

module.exports = { C, roughRect, roughLine, arrow, text, lines, svg, tag, esc, j, tuskMark, walrusMark, memwalMark, suiMark };

// ----------------------------------------------------------------------
// Build the four diagrams
// ----------------------------------------------------------------------
const D = module.exports;

function blob(cx, cy, r, fill, stroke) {
  // a wobbly "blob" circle for Walrus blobs
  let d = "M ";
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = r + D.j(r * 0.12);
    const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
    d += (i === 0 ? "" : "L ") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  d += "Z";
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>`;
}

// ===== Diagram 1: System architecture =====
function d1() {
  let b = "";
  const W = 1280, H = 860;
  // Agent / app
  b += D.roughRect(80, 170, 300, 150, { fill: D.C.grayFill });
  b += D.lines(230, 245, [
    { t: "Your LangGraph agent", weight: "bold", size: 24 },
    { t: "researcher → writer", size: 18, fill: D.C.sub },
    { t: "(Claude / Cursor / any)", size: 17, fill: D.C.sub },
  ]);

  // WalrusSaver (the drop-in)
  b += D.roughRect(490, 150, 320, 190, { fill: D.C.flameFill, stroke: D.C.flame });
  b += D.lines(650, 210, [
    { t: "WalrusSaver", weight: "bold", size: 26, fill: D.C.flame },
    { t: "drop-in BaseCheckpointSaver", size: 17, fill: D.C.sub },
    { t: "serialize → gzip →", size: 18 },
    { t: "content-addressed blob", size: 18 },
  ]);

  // MCP server badge
  b += D.roughRect(490, 380, 320, 110, { fill: D.C.paper, stroke: D.C.flame });
  b += D.lines(650, 422, [
    { t: "MCP server  ·  11 tools", weight: "bold", size: 21, fill: D.C.ink },
    { t: "save · load · fork · verify …", size: 16, fill: D.C.sub },
  ]);
  b += D.roughLine(650, 340, 650, 380, D.C.flame, 2);

  // Walrus storage
  b += D.roughRect(930, 150, 290, 210, { fill: D.C.tealFill, stroke: D.C.teal });
  b += D.walrusMark(975, 192, 0.95);
  b += D.text(1090, 184, "Walrus", { size: 26, weight: "bold", fill: D.C.teal });
  b += D.text(1090, 208, "decentralized blob storage", { size: 14, fill: D.C.sub, anchor: "middle" });
  b += blob(1000, 270, 26, "#eafaf6", D.C.teal);
  b += blob(1075, 278, 23, "#eafaf6", D.C.teal);
  b += blob(1150, 270, 26, "#eafaf6", D.C.teal);
  b += D.text(1075, 322, "erasure-coded across nodes,", { size: 14, fill: D.C.sub });
  b += D.suiMark(990, 343, 0.5);
  b += D.text(1090, 348, "coordinated on Sui", { size: 14, fill: D.C.sub });

  // MemWal  (a core goal, not optional)
  b += D.roughRect(930, 405, 290, 150, { fill: D.C.blueFill, stroke: D.C.blue });
  b += D.memwalMark(972, 437, 0.85);
  b += D.text(1098, 444, "MemWal", { size: 24, weight: "bold", fill: D.C.blue });
  b += D.lines(1075, 505, [
    { t: "plain-English memory for the run:", size: 15, fill: D.C.sub },
    { t: "a summary per checkpoint →", size: 15, fill: D.C.sub },
    { t: "the agent recalls its own past", size: 15, fill: D.C.sub },
  ]);

  // Local pointer cache
  b += D.roughRect(490, 560, 320, 120, { fill: D.C.yellowFill, stroke: D.C.yellow });
  b += D.lines(650, 605, [
    { t: "local cache", weight: "bold", size: 21 },
    { t: "ONLY a blob pointer", size: 17, fill: D.C.sub },
    { t: "(no state on disk)", size: 16, fill: D.C.sub },
  ]);

  // arrows
  b += D.arrow(380, 240, 488, 240, { stroke: D.C.flame });
  b += D.tag(434, 224, "checkpoint", D.C.paper);
  b += D.arrow(810, 230, 928, 230, { stroke: D.C.teal });
  b += D.tag(869, 214, "write blob");
  b += D.arrow(928, 320, 812, 320, { stroke: D.C.teal });
  b += D.tag(870, 304, "read blob");
  b += D.arrow(810, 450, 928, 470, { stroke: D.C.blue });
  b += D.tag(869, 432, "summary");
  b += D.arrow(650, 490, 650, 558, { stroke: D.C.yellow });
  b += D.tag(650, 526, "pointer");

  fs.writeFileSync(path.join(OUT, "01_architecture.svg"),
    D.svg(W, H, b, "How TuskPoint fits together",
      "A drop-in checkpointer: your agent stays the same, state moves onto Walrus."));
}

// ===== Diagram 2: write / crash / resume flow =====
function d2() {
  let b = "";
  const W = 1280, H = 820;
  const y = 300;
  const steps = [
    { x: 120, t: "step -1", s: "initial input", fill: D.C.grayFill },
    { x: 380, t: "step 0", s: "topic set", fill: D.C.flameFill, st: D.C.flame },
    { x: 640, t: "step 1", s: "sources", fill: D.C.flameFill, st: D.C.flame },
    { x: 900, t: "step 2", s: "report", fill: D.C.flameFill, st: D.C.flame },
  ];
  steps.forEach((s, i) => {
    b += D.roughRect(s.x, y, 200, 120, { fill: s.fill, stroke: s.st || D.C.line });
    b += D.lines(s.x + 100, y + 44, [
      { t: s.t, weight: "bold", size: 22 },
      { t: s.s, size: 18, fill: D.C.sub },
    ]);
    // each box -> a blob beneath
    b += blob(s.x + 100, y + 200, 34, D.C.tealFill, D.C.teal);
    b += D.walrusMark(s.x + 100, y + 200, 0.42);
    b += D.text(s.x + 100, y + 248, "Walrus blob + SHA-256", { size: 13, fill: D.C.sub });
    b += D.arrow(s.x + 100, y + 120, s.x + 100, y + 166, { stroke: D.C.teal });
    if (i < steps.length - 1) {
      b += D.arrow(s.x + 200, y + 60, steps[i + 1].x - 2, y + 60, { stroke: D.C.line });
    }
  });

  // crash bolt between step1 and step2
  b += `<path d="M 855 150 L 838 210 L 862 210 L 842 270" fill="none" stroke="${D.C.red}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
  b += D.text(848, 132, "CRASH", { size: 22, weight: "bold", fill: D.C.red });

  // resume arrow: fresh process reads latest blob
  b += D.roughRect(120, 600, 360, 130, { fill: D.C.greenFill, stroke: D.C.green });
  b += D.lines(300, 648, [
    { t: "fresh process restarts", weight: "bold", size: 22, fill: D.C.green },
    { t: "reads latest checkpoint pointer,", size: 17, fill: D.C.sub },
    { t: "rehydrates state, continues", size: 17, fill: D.C.sub },
  ]);
  b += D.arrow(740, 580, 470, 665, { stroke: D.C.green });
  b += D.tag(600, 612, "resume from last good blob");

  // no-rerun callout
  b += D.roughRect(720, 600, 440, 130, { fill: D.C.paper, stroke: D.C.line });
  b += D.lines(940, 645, [
    { t: "No replay from zero.", weight: "bold", size: 22 },
    { t: "Steps -1 … 1 are already durable on", size: 17, fill: D.C.sub },
    { t: "Walrus, so only step 2 runs again.", size: 17, fill: D.C.sub },
  ]);

  fs.writeFileSync(path.join(OUT, "02_crash_resume.svg"),
    D.svg(W, H, b, "Crash-proof by construction",
      "Every step is a durable, hashed Walrus blob, so a dead process resumes where it stopped."));
}

// ===== Diagram 3: fork / rollback / handoff lineage =====
function d3() {
  let b = "";
  const W = 1300, H = 860;
  function node(x, y, label, fill, stroke) {
    b += blob(x, y, 30, fill, stroke || D.C.teal);
    return [x, y];
  }
  // main thread line
  b += D.text(120, 175, "thread: run-43312", { size: 20, weight: "bold", anchor: "start", fill: D.C.ink });
  const mainY = 230;
  const xs = [200, 360, 520, 680];
  xs.forEach((x, i) => {
    node(x, mainY, "", D.C.flameFill, D.C.flame);
    b += D.text(x, mainY + 5, "c" + i, { size: 16, fill: D.C.flame });
    if (i) b += D.arrow(xs[i - 1] + 30, mainY, x - 30, mainY, { stroke: D.C.flame });
  });

  // FORK off c1 -> new thread
  b += D.arrow(360, mainY + 30, 360, 360, { stroke: D.C.blue });
  b += D.tag(360, 300, "fork  (git branch)", D.C.paper);
  b += D.text(120, 405, "thread: fork-alt", { size: 19, weight: "bold", anchor: "start", fill: D.C.blue });
  const forkXs = [360, 520, 680];
  forkXs.forEach((x, i) => {
    node(x, 440, "", D.C.blueFill, D.C.blue);
    b += D.text(x, 445, "f" + i, { size: 16, fill: D.C.blue });
    if (i) b += D.arrow(forkXs[i - 1] + 30, 440, x - 30, 440, { stroke: D.C.blue });
  });

  // ROLLBACK: c3 state re-written as new head c4 (same thread, append-only)
  node(840, mainY, "", D.C.yellowFill, D.C.yellow);
  b += D.text(840, mainY + 5, "c4", { size: 16, fill: D.C.yellow });
  b += D.arrow(710, mainY, 810, mainY, { stroke: D.C.flame });
  // dashed curve from c1 up-over to c4 to show "restored from earlier"
  b += `<path d="M 360 ${mainY - 30} Q 600 110 840 ${mainY - 30}" fill="none" stroke="${D.C.yellow}" stroke-width="2.4" stroke-dasharray="3 7"/>`;
  b += D.tag(600, 120, "rollback: restore c1 as new head c4", D.C.paper);
  b += D.text(840, mainY + 70, "append-only", { size: 15, fill: D.C.sub });
  b += D.text(840, mainY + 90, "nothing deleted", { size: 15, fill: D.C.sub });

  // HANDOFF: emit descriptor from c4 -> another agent adopts
  b += D.roughRect(540, 600, 320, 150, { fill: D.C.paper, stroke: D.C.line });
  b += D.lines(700, 648, [
    { t: "handoff descriptor", weight: "bold", size: 21 },
    { t: "blob id + SHA-256", size: 17, mono: true, fill: D.C.sub },
    { t: "(tiny, portable, no state copy)", size: 15, fill: D.C.sub },
  ]);
  b += D.arrow(870, mainY + 30, 790, 598, { stroke: D.C.green });
  b += D.tag(905, 430, "handoff");

  b += D.roughRect(960, 600, 290, 150, { fill: D.C.greenFill, stroke: D.C.green });
  b += D.lines(1105, 648, [
    { t: "Agent B adopts", weight: "bold", size: 22, fill: D.C.green },
    { t: "re-fetches blob,", size: 17, fill: D.C.sub },
    { t: "verifies hash, then trusts.", size: 17, fill: D.C.sub },
    { t: "tampered → rejected", size: 16, fill: D.C.red },
  ]);
  b += D.arrow(860, 675, 958, 675, { stroke: D.C.green });

  fs.writeFileSync(path.join(OUT, "03_lineage.svg"),
    D.svg(W, H, b, "Git for agent runs",
      "Fork a checkpoint, roll back without deleting history, or hand a run to another agent."));
}

// ===== Diagram 4: verify / tamper-evident audit =====
function d4() {
  let b = "";
  const W = 1280, H = 860;
  // left: stored at write time
  b += D.text(300, 165, "At write time", { size: 24, weight: "bold", fill: D.C.ink });
  const rows = [
    { y: 230, s: "PASS", ok: true },
    { y: 330, s: "PASS", ok: true },
    { y: 430, s: "FAIL", ok: false },
    { y: 530, s: "PASS", ok: true },
  ];
  rows.forEach((r, i) => {
    b += blob(180, r.y, 34, D.C.tealFill, D.C.teal);
    b += D.walrusMark(180, r.y, 0.5);
    // stored hash chip
    b += D.roughRect(260, r.y - 26, 250, 52, { fill: D.C.grayFill });
    b += D.text(385, r.y - 2, "sha256 a9f3…" + (i + 2) + "c", { size: 17, mono: true, fill: D.C.sub });
    b += D.text(385, r.y + 18, "stored at write", { size: 13, fill: D.C.sub });
  });

  // arrow across = verify_trail re-hash
  b += D.arrow(540, 380, 700, 380, { stroke: D.C.flame, w: 3 });
  b += D.tag(620, 360, "verify_trail: re-fetch + re-hash", D.C.paper);

  // right: recomputed now + compare
  b += D.text(940, 165, "At verify time", { size: 24, weight: "bold", fill: D.C.ink });
  rows.forEach((r, i) => {
    const okCol = r.ok ? D.C.green : D.C.red;
    const fill = r.ok ? D.C.greenFill : D.C.redFill;
    b += D.roughRect(740, r.y - 30, 420, 60, { fill, stroke: okCol });
    b += D.text(770, r.y + 6, "recompute → ", { size: 17, fill: D.C.sub, anchor: "start" });
    b += D.text(975, r.y + 6, r.ok ? "matches ✓" : "differs ✗", { size: 19, weight: "bold", fill: okCol, anchor: "start" });
    // status pill
    b += `<rect x="1080" y="${r.y - 18}" width="64" height="36" rx="9" fill="${okCol}"/>`;
    b += D.text(1112, r.y + 6, r.s, { size: 17, weight: "bold", fill: "#fff" });
  });

  // bottom verdict
  b += D.roughRect(180, 640, 920, 130, { fill: D.C.paper, stroke: D.C.line });
  b += D.lines(640, 678, [
    { t: "A swapped or corrupted blob is a FAIL, not just a failed download.", weight: "bold", size: 23 },
    { t: "ok = (at least one PASS) AND (zero FAIL).  No stored hash → UNVERIFIED, never a silent pass.", size: 17, fill: D.C.sub },
  ]);

  fs.writeFileSync(path.join(OUT, "04_verify.svg"),
    D.svg(W, H, b, "Cryptographically tamper-evident",
      "Each blob is SHA-256 hashed at write time; verify re-hashes and compares, byte for byte."));
}

// ===== Diagram 5: the whole story on one canvas =====
function d5() {
  let b = "";
  const W = 1680, H = 1180;

  // ---- (1) WRITE PATH: agent -> WalrusSaver -> Walrus, + pointer ----
  b += D.roughRect(70, 180, 250, 120, { fill: D.C.grayFill });
  b += D.lines(195, 230, [
    { t: "LangGraph agent", weight: "bold", size: 22 },
    { t: "state · writes · metadata", size: 15, fill: D.C.sub },
  ]);

  b += D.roughRect(400, 165, 300, 150, { fill: D.C.flameFill, stroke: D.C.flame });
  b += D.lines(550, 218, [
    { t: "TuskPoint", weight: "bold", size: 26, fill: D.C.flame },
    { t: "WalrusSaver — drop-in", size: 16, fill: D.C.sub },
    { t: "serialize → gzip → SHA-256", size: 15, fill: D.C.sub },
  ]);

  b += D.roughRect(780, 150, 320, 200, { fill: D.C.tealFill, stroke: D.C.teal });
  b += D.text(940, 188, "Walrus", { size: 25, weight: "bold", fill: D.C.teal });
  b += D.text(940, 211, "decentralized blobs", { size: 13, fill: D.C.sub });
  b += blob(845, 268, 22, "#eafaf6", D.C.teal);
  b += blob(915, 274, 20, "#eafaf6", D.C.teal);
  b += blob(985, 268, 22, "#eafaf6", D.C.teal);
  b += D.text(940, 312, "erasure-coded across nodes,", { size: 13, fill: D.C.sub });
  b += D.text(940, 334, "availability anchored on Sui", { size: 13, fill: D.C.sub });

  b += D.roughRect(400, 360, 300, 90, { fill: D.C.yellowFill, stroke: D.C.yellow });
  b += D.lines(550, 396, [
    { t: "local cache", weight: "bold", size: 19 },
    { t: "ONLY a blob pointer — no state on disk", size: 14, fill: D.C.sub },
  ]);

  b += D.arrow(320, 240, 398, 240, { stroke: D.C.flame });
  b += D.tag(360, 224, "checkpoint");
  b += D.arrow(700, 235, 778, 235, { stroke: D.C.teal });
  b += D.tag(740, 219, "store");
  b += D.arrow(550, 315, 550, 358, { stroke: D.C.yellow });

  // ---- (2) CRASH / RESUME ----
  b += `<path d="M 1230 175 L 1213 225 L 1237 225 L 1217 280" fill="none" stroke="${D.C.red}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
  b += D.text(1222, 160, "CRASH", { size: 19, weight: "bold", fill: D.C.red });
  b += D.roughRect(1170, 300, 430, 130, { fill: D.C.greenFill, stroke: D.C.green });
  b += D.lines(1385, 345, [
    { t: "crash · evict · migrate", weight: "bold", size: 20, fill: D.C.green },
    { t: "a fresh process rehydrates from the", size: 15, fill: D.C.sub },
    { t: "last verified checkpoint, not from zero", size: 15, fill: D.C.sub },
  ]);
  b += D.arrow(1110, 250, 1168, 340, { stroke: D.C.green });
  b += D.tag(1140, 295, "resume");

  // section divider
  b += D.roughLine(60, 480, 1620, 480, D.C.sub, 1.4);

  // ---- (3) VERSION-CONTROL DAG: diff / fork / rollback ----
  b += D.text(70, 540, "Git for agent memory", { size: 22, weight: "bold", anchor: "start", fill: D.C.flame });
  const mY = 600;
  const xs = [120, 250, 380, 510];
  xs.forEach((x, i) => {
    b += blob(x, mY, 26, D.C.flameFill, D.C.flame);
    b += D.text(x, mY + 5, "c" + i, { size: 14, fill: D.C.flame });
    if (i) b += D.arrow(xs[i - 1] + 26, mY, x - 26, mY, { stroke: D.C.flame });
  });
  // diff
  b += `<path d="M 250 ${mY - 26} Q 315 ${mY - 70} 380 ${mY - 26}" fill="none" stroke="${D.C.ink}" stroke-width="2" stroke-dasharray="3 5"/>`;
  b += D.tag(315, mY - 70, "diff", D.C.paper);
  // fork
  b += D.arrow(250, mY + 26, 250, mY + 120, { stroke: D.C.blue });
  b += D.tag(250, mY + 78, "fork (branch)", D.C.paper);
  [250, 380, 510].forEach((x, i) => {
    b += blob(x, mY + 150, 22, D.C.blueFill, D.C.blue);
    b += D.text(x, mY + 155, "f" + i, { size: 13, fill: D.C.blue });
    if (i) b += D.arrow([250, 380][i - 1] + 22, mY + 150, x - 22, mY + 150, { stroke: D.C.blue });
  });
  // rollback
  b += blob(640, mY, 26, D.C.yellowFill, D.C.yellow);
  b += D.text(640, mY + 5, "c4", { size: 14, fill: D.C.yellow });
  b += D.arrow(536, mY, 614, mY, { stroke: D.C.flame });
  b += `<path d="M 250 ${mY - 26} Q 445 ${mY - 110} 640 ${mY - 26}" fill="none" stroke="${D.C.yellow}" stroke-width="2.2" stroke-dasharray="3 7"/>`;
  b += D.tag(445, mY - 110, "rollback: re-write earlier state as new head", D.C.paper);
  b += D.text(640, mY + 60, "append-only · nothing deleted", { size: 13, fill: D.C.sub });

  // ---- (4) HANDOFF / ADOPT ----
  b += D.roughRect(820, 560, 330, 130, { fill: D.C.paper, stroke: D.C.line });
  b += D.lines(985, 605, [
    { t: "handoff_checkpoint", weight: "bold", size: 19 },
    { t: "tiny descriptor: blob id + SHA-256", size: 14, mono: true, fill: D.C.sub },
    { t: "(portable, no state copy)", size: 13, fill: D.C.sub },
  ]);
  b += D.roughRect(1230, 560, 370, 130, { fill: D.C.greenFill, stroke: D.C.green });
  b += D.lines(1415, 600, [
    { t: "adopt_checkpoint", weight: "bold", size: 19, fill: D.C.green },
    { t: "re-fetch blob, re-verify SHA-256,", size: 14, fill: D.C.sub },
    { t: "adopt as a new thread", size: 14, fill: D.C.sub },
    { t: "tampered → rejected before it is state", size: 13, fill: D.C.red },
  ]);
  b += D.arrow(666, mY, 818, 615, { stroke: D.C.green });
  b += D.arrow(1150, 625, 1228, 625, { stroke: D.C.green });
  b += D.tag(1190, 609, "no shared FS");

  // section divider
  b += D.roughLine(60, 740, 1620, 740, D.C.sub, 1.4);

  // ---- (5) VERIFY TRAIL ----
  b += D.text(70, 800, "Tamper-evident audit", { size: 22, weight: "bold", anchor: "start", fill: D.C.flame });
  const vr = [["PASS", true], ["PASS", true], ["FAIL", false], ["UNVERIFIED", null]];
  vr.forEach(([s, ok], i) => {
    const y = 840 + i * 56;
    const col = ok === true ? D.C.green : ok === false ? D.C.red : D.C.amber;
    const fill = ok === true ? D.C.greenFill : ok === false ? D.C.redFill : D.C.amberFill;
    b += D.roughRect(70, y - 22, 430, 46, { fill, stroke: col });
    b += D.text(92, y + 6, "c" + i + "  recompute → " + (ok === true ? "matches" : ok === false ? "differs" : "no stored hash"), { size: 15, fill: D.C.sub, anchor: "start" });
    b += `<rect x="380" y="${y - 16}" width="112" height="34" rx="9" fill="${col}"/>`;
    b += D.text(436, y + 7, s, { size: 14, weight: "bold", fill: "#fff" });
  });
  b += D.text(70, 1088, "SHA-256 stored on write, re-hashed on read — silent change is impossible.", { size: 15, anchor: "start", fill: D.C.sub, italic: true });

  // ---- (6) MEMWAL recall ----
  b += D.roughRect(560, 800, 470, 150, { fill: D.C.blueFill, stroke: D.C.blue });
  b += D.text(795, 845, "MemWal (core layer)", { size: 21, weight: "bold", fill: D.C.blue });
  b += D.lines(795, 905, [
    { t: "a one-line summary per checkpoint →", size: 15, fill: D.C.sub },
    { t: "\u201cwhen did I last have a passing build?\u201d", size: 15, fill: D.C.ink, italic: true },
    { t: "→ recall + load that exact state back", size: 15, fill: D.C.sub },
  ]);
  b += D.text(795, 975, "memory that is queryable, not just storable", { size: 14, anchor: "middle", fill: D.C.sub, italic: true });

  // ---- (7) MCP + (8) surfaces ----
  b += D.roughRect(1080, 800, 520, 100, { fill: D.C.flameFill, stroke: D.C.flame });
  b += D.lines(1340, 838, [
    { t: "all-in-one MCP server  ·  11 tools", weight: "bold", size: 19, fill: D.C.flame },
    { t: "save load list resume diff fork rollback", size: 14, fill: D.C.sub },
    { t: "handoff adopt verify search  + tuskpoint_info", size: 14, fill: D.C.sub },
  ]);
  b += D.text(1340, 928, "Claude · Cursor · Windsurf · VS Code · Codex", { size: 14, anchor: "middle", fill: D.C.sub });

  b += D.roughRect(1080, 970, 520, 120, { fill: D.C.paper, stroke: D.C.line });
  b += D.lines(1340, 1010, [
    { t: "Four real surfaces", weight: "bold", size: 18 },
    { t: "Python library · MCP server ·", size: 14, fill: D.C.sub },
    { t: "live FastAPI on testnet · dashboard tuskpoint.xyz", size: 14, fill: D.C.sub },
  ]);
  b += D.text(1340, 1078, "every checkpoint, diff, search, fork, audit hits live Walrus — nothing mocked", { size: 13, anchor: "middle", fill: D.C.flame, weight: "bold" });

  fs.writeFileSync(path.join(OUT, "05_overview.svg"),
    D.svg(W, H, b, "TuskPoint at a glance",
      "Verifiable, durable, version-controlled memory for AI agents on Walrus."));
}

d1(); d2(); d3(); d4();
module.exports._noMarks = true; d5(); module.exports._noMarks = false;
console.log("SVGs written.");

// ---- render each SVG to PNG via headless Edge ----
const files = ["01_architecture", "02_crash_resume", "03_lineage", "04_verify", "05_overview"];
for (const f of files) {
  const svgPath = path.join(OUT, f + ".svg");
  const pngPath = path.join(OUT, f + ".png");
  // wrap svg in an html so the browser renders fonts crisply at 2x
  const svgData = fs.readFileSync(svgPath, "utf8");
  const m = svgData.match(/width="(\d+)" height="(\d+)"/);
  const w = m ? +m[1] : 1280, h = m ? +m[2] : 860;
  const htmlPath = path.join(OUT, "_tmp_" + f + ".html");
  fs.writeFileSync(htmlPath,
    `<!doctype html><html><head><meta charset="utf8"><style>html,body{margin:0;padding:0}</style></head><body>${svgData}</body></html>`);
  const scale = f === "05_overview" ? 3 : 2;
  try {
    execFileSync(EDGE, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars",
      `--force-device-scale-factor=${scale}`,
      `--window-size=${w},${h}`,
      `--screenshot=${pngPath}`,
      "file:///" + htmlPath.replace(/\\/g, "/"),
    ], { stdio: "ignore", timeout: 90000 });
    console.log("rendered", pngPath);
  } catch (e) {
    console.error("render failed for", f, e.message);
  }
  fs.unlinkSync(htmlPath);
}
console.log("done.");
