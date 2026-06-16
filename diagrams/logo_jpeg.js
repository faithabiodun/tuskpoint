// Render the TuskPoint LogoMark SVG to a real JPEG via headless Edge + canvas.
// The page draws the SVG onto a 1200x1200 canvas over a solid dark background
// and writes canvas.toDataURL('image/jpeg') into <pre id="out">. We capture
// that with --dump-dom, decode the base64, and write tuskpoint-logo.jpeg.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const htmlPath = path.join(__dirname, "logo_jpeg.html");
const outJpeg = path.join(__dirname, "tuskpoint-logo.jpeg");

const dom = execFileSync(
  EDGE,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--virtual-time-budget=4000",
    "--run-all-compositor-stages-before-draw",
    "--dump-dom",
    "file:///" + htmlPath.replace(/\\/g, "/"),
  ],
  { encoding: "utf8", timeout: 90000, maxBuffer: 64 * 1024 * 1024 }
);

const m = dom.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/);
if (!m) {
  console.error("No JPEG data URL found in DOM. First 400 chars:\n" + dom.slice(0, 400));
  process.exit(1);
}
fs.writeFileSync(outJpeg, Buffer.from(m[1], "base64"));
const kb = (fs.statSync(outJpeg).size / 1024).toFixed(1);
console.log("wrote", outJpeg, kb + " KB");
