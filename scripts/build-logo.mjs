// scripts/build-logo.mjs
// Makes the logo files the site uses from the master file public/logo.webp (a transparent PNG).
// Run again after changing the logo:  node scripts/build-logo.mjs
//
//   public/brand/logo.png          colour logo, empty margins trimmed (light backgrounds, emails)
//   public/brand/logo-on-dark.png  the same with the navy parts turned white (navy backgrounds)
//   app/icon.png                   browser tab icon: the swoosh symbol alone, square
//   app/apple-icon.png             home-screen icon: the symbol on white, square
import fs from "node:fs";
import sharp from "sharp";

const SRC = "public/logo.webp";
const WIDTH = 800; // enough for 2x screens at the largest size used (about 240px wide)

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const at = (x, y) => (y * W + x) * 4;
const visible = (i) => data[i + 3] > 20 && !(data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235);

// Bounding box of everything visible, and of the symbol (the swoosh: left part, up to the first column gap)
let box = { x0: W, y0: H, x1: 0, y1: 0 };
const colHasInk = new Array(W).fill(false);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (visible(at(x, y))) {
      colHasInk[x] = true;
      box = { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) };
    }
const pad = Math.round((box.y1 - box.y0) * 0.04);
const crop = {
  left: Math.max(0, box.x0 - pad),
  top: Math.max(0, box.y0 - pad),
  width: Math.min(W, box.x1 + pad) - Math.max(0, box.x0 - pad),
  height: Math.min(H, box.y1 + pad) - Math.max(0, box.y0 - pad),
};

// The symbol ends where the swoosh's top arc ends: the first fully empty column after it, if any; else ~29% of the width
let symbolEnd = box.x0 + Math.round((box.x1 - box.x0) * 0.29);
for (let x = box.x0 + 50; x < box.x0 + (box.x1 - box.x0) * 0.4; x++) if (!colHasInk[x]) { symbolEnd = x; break; }

fs.mkdirSync("public/brand", { recursive: true });

// 1. Colour logo
await sharp(SRC).extract(crop).resize({ width: WIDTH }).png({ compressionLevel: 9, palette: false }).toFile("public/brand/logo.png");

// 2. On dark: dark (navy) pixels blend to white by how dark they are; light blue stays as it is
const dark = Buffer.from(data);
for (let i = 0; i < dark.length; i += 4) {
  const l = (0.2126 * dark[i] + 0.7152 * dark[i + 1] + 0.0722 * dark[i + 2]) / 255;
  const t = Math.min(1, Math.max(0, (0.5 - l) / 0.3)); // l ≤ 0.2 → white, l ≥ 0.5 → unchanged
  for (let c = 0; c < 3; c++) dark[i + c] = Math.round(dark[i + c] + (255 - dark[i + c]) * t);
}
await sharp(dark, { raw: { width: W, height: H, channels: 4 } }).extract(crop).resize({ width: WIDTH }).png({ compressionLevel: 9 }).toFile("public/brand/logo-on-dark.png");

// 3–4. Icons: the symbol, centred in a square.
// The thin underline under "COLABORA" starts inside the symbol's area: find its rows (the only ink in the middle of
// the logo below the lettering) and remove it from the symbol, so the icon is the swoosh alone.
const midX = Math.round(box.x0 + (box.x1 - box.x0) * 0.45);
const letterBottom = Math.round(box.y0 + (box.y1 - box.y0) * 0.62);
const lineRows = [];
for (let y = letterBottom; y <= box.y1; y++) if (data[at(midX, y) + 3] > 20) lineRows.push(y);
const symbolData = Buffer.from(data);
if (lineRows.length) {
  const y0 = lineRows[0] - 3, y1 = lineRows.at(-1) + 3;
  let lineStart = midX; // walk left along the line to where it starts
  while (lineStart > box.x0 && data[at(lineStart - 1, lineRows[Math.floor(lineRows.length / 2)]) + 3] > 20) lineStart--;
  for (let y = y0; y <= y1; y++) for (let x = lineStart - 3; x < W; x++) symbolData[at(x, y) + 3] = 0;
}
const symbolCut = await sharp(symbolData, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: crop.left, top: crop.top, width: symbolEnd - crop.left, height: crop.height })
  .png()
  .toBuffer();
const symbol = await sharp(symbolCut).trim({ threshold: 10 }).toBuffer();
const square = async (size, background, inset) => {
  const inner = Math.round(size * (1 - 2 * inset));
  const mark = await sharp(symbol).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: mark, gravity: "center" }]).png();
};
await (await square(512, { r: 0, g: 0, b: 0, alpha: 0 }, 0.02)).toFile("app/icon.png");
await (await square(180, { r: 255, g: 255, b: 255, alpha: 1 }, 0.12)).toFile("app/apple-icon.png");

for (const f of ["public/brand/logo.png", "public/brand/logo-on-dark.png", "app/icon.png", "app/apple-icon.png"]) {
  const m = await sharp(f).metadata();
  console.log(`${f}: ${m.width}x${m.height}, ${Math.round(fs.statSync(f).size / 1024)} KB`);
}
