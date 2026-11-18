// news-image-20261118 entry: "The World in One Picture"
// A deterministic procedural newspaper front page for Wednesday 18 Nov 2026.
// Node 22, standard library only. Renders at 2048x2048, downsamples to
// 1024x1024, and writes entry.png into MAKEFUN_OUTPUT_DIR (fallback /output).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------- deterministic PRNG (mulberry32, fixed seed) ----------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261118);

// ---------- canvas ----------
type RGB = [number, number, number];
const W = 2048;
const H = 2048;
const buf = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++)
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = Math.floor(cy - r); yy <= cy + r; yy++)
    for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
}
function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let yy = Math.floor(cy - r - t); yy <= cy + r + t; yy++)
    for (let xx = Math.floor(cx - r - t); xx <= cx + r + t; xx++) {
      const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
      if (Math.abs(d - r) <= t) setPx(xx, yy, c);
    }
}
function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    fillCircle(x, y, t, c);
  }
}
function fillTri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.floor(Math.min(x0, x1, x2)), maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let yy = minY; yy <= maxY; yy++)
    for (let xx = minX; xx <= maxX; xx++) {
      const w0 = ((y1 - y2) * (xx - x2) + (x2 - x1) * (yy - y2)) / d;
      const w1 = ((y2 - y0) * (xx - x2) + (x0 - x2) * (yy - y2)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) setPx(xx, yy, c);
    }
}

// ---------- palette ----------
const PAPER: RGB = [246, 241, 226];
const INK: RGB = [18, 18, 22];
const WHITE: RGB = [255, 255, 255];
const RED: RGB = [178, 30, 38];
const GOLD: RGB = [245, 197, 66];
const SKY: RGB = [135, 190, 235];
const SEA: RGB = [30, 100, 170];
const SAND: RGB = [222, 190, 130];
const GREEN: RGB = [34, 150, 80];
const GREY: RGB = [90, 96, 105];
const DARKBLUE: RGB = [22, 48, 96];

// ---------- 5x7 bitmap font (hand-defined) ----------
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.##.", "#..##", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", "..#..", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "##..#", "#.#.#", "#..##", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
  "2": [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  ";": [".....", "..#..", ".....", ".....", ".....", "..#..", ".#..."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "%": ["##..#", "##.#.", "....#", "...#.", "..#..", ".#...", "#..##"],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
};
function textW(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const chRaw of s.toUpperCase()) {
    const g = FONT[chRaw] ?? FONT[" "];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "#") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 6 * scale;
  }
}
function drawTextC(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - textW(s, scale) / 2, y, s, scale, c);
}
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- icons (drawn inside box x,y,w,h) ----------
function drone(cx: number, cy: number, s: number, c: RGB): void {
  fillRect(cx - s, cy - s * 0.22, s * 2, s * 0.44, c);
  line(cx - s, cy - s * 0.3, cx - s * 1.7, cy - s * 0.9, s * 0.14, c);
  line(cx + s, cy - s * 0.3, cx + s * 1.7, cy - s * 0.9, s * 0.14, c);
  line(cx - s, cy + s * 0.3, cx - s * 1.7, cy + s * 0.9, s * 0.14, c);
  line(cx + s, cy + s * 0.3, cx + s * 1.7, cy + s * 0.9, s * 0.14, c);
  for (const [ox, oy] of [[-1.7, -0.9], [1.7, -0.9], [-1.7, 0.9], [1.7, 0.9]] as const)
    ring(cx + ox * s, cy + oy * s, s * 0.42, s * 0.13, c);
}
function iconGulf(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillCircle(x + w * 0.88, y + h * 0.2, h * 0.13, GOLD);
  fillRect(x, y + h * 0.68, w, h * 0.32, SEA);
  fillRect(x, y + h * 0.6, w * 0.55, h * 0.1, SAND);
  // radar dish on the coast
  const bx = x + w * 0.2, by = y + h * 0.62;
  line(bx, by, bx, by - h * 0.34, 7, INK);
  fillTri(bx - h * 0.2, by - h * 0.52, bx + h * 0.2, by - h * 0.52, bx, by - h * 0.3, INK);
  ring(bx, by - h * 0.52, h * 0.1, 4, RED);
  ring(bx, by - h * 0.52, h * 0.19, 4, RED);
  fillCircle(bx, by - h * 0.52, 7, RED);
  // drones inbound, one bursting (intercepted)
  drone(x + w * 0.58, y + h * 0.24, h * 0.09, INK);
  drone(x + w * 0.74, y + h * 0.38, h * 0.075, INK);
  const ix = x + w * 0.45, iy = y + h * 0.42;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    line(ix, iy, ix + Math.cos(a) * h * 0.11, iy + Math.sin(a) * h * 0.11, 5, [240, 130, 30]);
  }
  fillCircle(ix, iy, h * 0.045, GOLD);
}
function iconBridge(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + h * 0.66, w, h * 0.34, SEA);
  const deckY = y + h * 0.52;
  fillRect(x + w * 0.08, deckY - h * 0.34, w * 0.05, h * 0.36, GREY);
  fillRect(x + w * 0.87, deckY - h * 0.34, w * 0.05, h * 0.36, GREY);
  fillRect(x, deckY, w * 0.4, h * 0.07, GREY);
  fillRect(x + w * 0.6, deckY, w * 0.4, h * 0.07, GREY);
  line(x + w * 0.1, deckY - h * 0.32, x + w * 0.4, deckY, 4, GREY);
  line(x + w * 0.9, deckY - h * 0.32, x + w * 0.6, deckY, 4, GREY);
  // fallen span, tilted into the water
  const fx = x + w * 0.42, fy = y + h * 0.72;
  line(fx, fy - h * 0.1, fx + w * 0.17, fy + h * 0.08, h * 0.05, [120, 40, 40]);
  fillCircle(x + w * 0.5, y + h * 0.6, h * 0.05, [240, 130, 30]);
  // missile streak
  line(x + w * 0.72, y + h * 0.08, x + w * 0.55, y + h * 0.3, 5, RED);
  line(x + w * 0.78, y + h * 0.05, x + w * 0.6, y + h * 0.26, 4, GOLD);
}
function iconPlane(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillCircle(x + w * 0.1, y + h * 0.18, h * 0.1, GOLD);
  // skyline
  const base = y + h;
  const bw = [0.13, 0.1, 0.16, 0.11, 0.14, 0.1, 0.15];
  const bh = [0.34, 0.5, 0.28, 0.56, 0.38, 0.46, 0.3];
  let px = x;
  for (let i = 0; i < bw.length; i++) {
    fillRect(px, base - h * bh[i], w * bw[i] - 4, h * bh[i], DARKBLUE);
    px += w * bw[i];
  }
  // aeroplane
  const cx = x + w * 0.52, cy = y + h * 0.3, s = w * 0.0026;
  fillRect(cx - 60 * s, cy - 7 * s, 120 * s, 14 * s, WHITE);
  fillTri(cx + 60 * s, cy - 7 * s, cx + 82 * s, cy, cx + 60 * s, cy + 7 * s, WHITE);
  fillTri(cx - 6 * s, cy + 4 * s, cx + 22 * s, cy + 34 * s, cx + 38 * s, cy + 4 * s, WHITE);
  fillTri(cx - 58 * s, cy - 6 * s, cx - 78 * s, cy - 30 * s, cx - 44 * s, cy - 4 * s, RED);
  fillRect(cx - 30 * s, cy - 3 * s, 8 * s, 6 * s, DARKBLUE);
  fillRect(cx - 12 * s, cy - 3 * s, 8 * s, 6 * s, DARKBLUE);
  fillRect(cx + 6 * s, cy - 3 * s, 8 * s, 6 * s, DARKBLUE);
  // two flags
  line(x + w * 0.16, y + h * 0.98, x + w * 0.16, y + h * 0.42, 5, INK);
  fillRect(x + w * 0.16, y + h * 0.42, w * 0.11, h * 0.14, RED);
  line(x + w * 0.84, y + h * 0.98, x + w * 0.84, y + h * 0.42, 5, INK);
  fillRect(x + w * 0.84, y + h * 0.42, w * 0.11, h * 0.14, [30, 80, 200]);
  fillCircle(x + w * 0.895, y + h * 0.49, h * 0.03, GOLD);
}
function iconChip(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [16, 24, 40]);
  const cs = h * 0.62, cx0 = x + w * 0.1, cy0 = y + h * 0.19;
  for (let i = 0; i < 5; i++) {
    fillRect(cx0 + cs * 0.12 + i * cs * 0.18, cy0 - h * 0.07, cs * 0.07, h * 0.07, GOLD);
    fillRect(cx0 + cs * 0.12 + i * cs * 0.18, cy0 + cs, cs * 0.07, h * 0.07, GOLD);
    fillRect(cx0 - w * 0.035, cy0 + cs * 0.12 + i * cs * 0.18, w * 0.035, cs * 0.07, GOLD);
  }
  fillRect(cx0, cy0, cs, cs, [40, 90, 160]);
  fillRect(cx0 + cs * 0.18, cy0 + cs * 0.18, cs * 0.64, cs * 0.64, [70, 140, 210]);
  drawTextC(cx0 + cs / 2, cy0 + cs * 0.36, "NV", Math.max(4, Math.floor(cs / 26)), WHITE);
  // rising chart
  const gx = x + w * 0.52, gy = y + h * 0.82, gw = w * 0.42, gh = h * 0.6;
  line(gx, gy - gh, gx, gy, 4, [120, 140, 170]);
  line(gx, gy, gx + gw, gy, 4, [120, 140, 170]);
  const pts: [number, number][] = [[0, 0.12], [0.3, 0.3], [0.52, 0.26], [0.78, 0.62], [1, 0.95]];
  for (let i = 0; i + 1 < pts.length; i++)
    line(gx + pts[i][0] * gw, gy - pts[i][1] * gh, gx + pts[i + 1][0] * gw, gy - pts[i + 1][1] * gh, 8, GREEN);
  fillTri(gx + gw, gy - gh * 0.95, gx + gw - 26, gy - gh * 0.95, gx + gw, gy - gh * 0.95 + 26, GREEN);
  drawText(gx + 4, y + h * 0.06, "$115.84BN", 5, GOLD);
}
function iconCyclone(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SEA);
  const cx = x + w * 0.5, cy = y + h * 0.46;
  let px = cx, py = cy;
  for (let i = 0; i <= 160; i++) {
    const t = i / 160, a = t * Math.PI * 4.4;
    const nx = cx + Math.cos(a) * (8 + t * w * 0.27);
    const ny = cy + Math.sin(a) * (6 + t * h * 0.34);
    if (i > 0) line(px, py, nx, ny, 7, WHITE);
    px = nx; py = ny;
  }
  fillCircle(cx, cy, h * 0.09, [16, 70, 130]);
  ring(cx, cy, h * 0.09, 4, WHITE);
  // coast alert marks
  fillRect(x, y + h * 0.86, w, h * 0.14, SAND);
  fillTri(x + w * 0.14, y + h * 0.68, x + w * 0.2, y + h * 0.86, x + w * 0.08, y + h * 0.86, RED);
  drawTextC(x + w * 0.14, y + h * 0.71, "!", 5, WHITE);
  fillTri(x + w * 0.86, y + h * 0.68, x + w * 0.92, y + h * 0.86, x + w * 0.8, y + h * 0.86, RED);
  drawTextC(x + w * 0.86, y + h * 0.71, "!", 5, WHITE);
}
function iconGavel(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [232, 226, 205]);
  // faint map grid
  for (let i = 1; i < 5; i++) {
    line(x + (w * i) / 5, y, x + (w * i) / 5, y + h, 2, [200, 192, 165]);
    line(x, y + (h * i) / 5, x + w, y + (h * i) / 5, 2, [200, 192, 165]);
  }
  // map pin
  const px = x + w * 0.3, py = y + h * 0.34;
  fillCircle(px, py, h * 0.17, RED);
  fillTri(px - h * 0.15, py + h * 0.1, px + h * 0.15, py + h * 0.1, px, py + h * 0.42, RED);
  fillCircle(px, py, h * 0.07, WHITE);
  // gavel: diagonal handle with a thick head bar across its top end
  const gx = x + w * 0.66, gy = y + h * 0.42;
  line(gx - w * 0.15, gy + h * 0.32, gx + w * 0.07, gy - h * 0.2, 10, [120, 78, 36]);
  line(gx - w * 0.06, gy - h * 0.38, gx + w * 0.2, gy - h * 0.12, 17, [90, 58, 26]);
  line(gx - w * 0.06, gy - h * 0.38, gx - w * 0.01, gy - h * 0.31, 17, GOLD);
  line(gx + w * 0.15, gy - h * 0.19, gx + w * 0.2, gy - h * 0.12, 17, GOLD);
  fillRect(x + w * 0.48, y + h * 0.86, w * 0.4, h * 0.07, [90, 58, 26]);
}

// ---------- page layout ----------
function panel(x: number, y: number, w: number, h: number, bar: RGB, kicker: string,
  icon: (a: number, b: number, c: number, d: number) => void, iconH: number,
  headline: string, hScale: number, caption: string, capScale: number, capChars: number): void {
  fillRect(x, y, w, h, WHITE);
  fillRect(x, y, w, h, WHITE);
  for (let i = 0; i < 6; i++) {
    fillRect(x + i, y + i, w - 2 * i, 1, INK); fillRect(x + i, y + h - 1 - i, w - 2 * i, 1, INK);
    fillRect(x + i, y + i, 1, h - 2 * i, INK); fillRect(x + w - 1 - i, y + i, 1, h - 2 * i, INK);
  }
  const barH = hScale * 7 + 26;
  fillRect(x + 6, y + 6, w - 12, barH, bar);
  drawText(x + 22, y + 19, kicker, hScale - 1 >= 4 ? hScale - 1 : hScale, WHITE);
  const iy = y + 6 + barH + 10;
  icon(x + 14, iy, w - 28, iconH);
  const hy = iy + iconH + 16;
  drawTextC(x + w / 2, hy, headline, hScale, INK);
  const lines = wrap(caption, capChars);
  let cy = hy + hScale * 7 + 14;
  for (const ln of lines) {
    drawTextC(x + w / 2, cy, ln, capScale, [40, 40, 48]);
    cy += capScale * 7 + 9;
  }
}

function buildPage(): void {
  fillRect(0, 0, W, H, PAPER);
  // faint seeded paper speckle (deterministic)
  for (let i = 0; i < 500; i++) {
    const sx = Math.floor(rng() * W), sy = Math.floor(rng() * H);
    setPx(sx, sy, [232, 226, 205]);
  }
  // masthead
  fillRect(0, 0, W, 300, INK);
  fillRect(0, 292, W, 8, RED);
  drawTextC(W / 2, 30, "THE WORLD IN ONE PICTURE", 11, WHITE);
  drawTextC(W / 2, 132, "WEDNESDAY 18 NOVEMBER 2026", 10, GOLD);
  drawTextC(W / 2, 228, "ONE DAY, SIX BIG STORIES, ON A SINGLE PAGE", 5, WHITE);

  // lead story
  panel(24, 316, 2000, 564, RED, "LEAD STORY - MIDDLE EAST", iconGulf, 180,
    "GULF FLASHPOINT", 9,
    "IRANIAN DRONES AIMED AT A US RADAR IN BAHRAIN WERE ALL INTERCEPTED, WITH NO DAMAGE OR INJURIES. US JETS THEN STRUCK A MISSILE SITE ON QESHM ISLAND. KUWAIT ENGAGED DRONES AT DAWN.",
    5, 62);
  // row A
  panel(24, 896, 992, 484, DARKBLUE, "EUROPE - WAR", iconBridge, 140,
    "KERCH BRIDGE HIT", 6,
    "UKRAINE DESTROYED A ROAD SPAN OF THE BRIDGE TO OCCUPIED CRIMEA WITH CRUISE MISSILES ON THE NIGHT OF 16-17 NOV. RUSSIA HIT KYIV BRIDGES IN REPLY.",
    4, 38);
  panel(1032, 896, 992, 484, [20, 110, 90], "ASIA - DIPLOMACY", iconPlane, 140,
    "TRUMP IN MANILA", 6,
    "US PRESIDENT DONALD TRUMP ARRIVED IN MANILA FOR QUAD TALKS AND THE ASEAN SUMMIT, AHEAD OF A CHINA VISIT AND THE APEC SUMMIT.",
    4, 38);
  // row B
  panel(24, 1396, 656, 444, [52, 40, 110], "BUSINESS", iconChip, 110,
    "NVIDIA SALES DOUBLE", 5,
    "REVENUE 115.84 BILLION DOLLARS, DOUBLE A YEAR AGO. FIRST REPORT SINCE CEO HUANG WAS OUSTED. BOARD: NO RETURN.",
    4, 26);
  panel(696, 1396, 656, 444, [10, 110, 150], "WEATHER", iconCyclone, 110,
    "CYCLONE AKVAN NEARS", 5,
    "A CYCLONIC STORM IS INTENSIFYING OVER THE BAY OF BENGAL. ANDHRA PRADESH AND ODISHA COASTS ARE ON ALERT.",
    4, 26);
  panel(1368, 1396, 656, 444, [110, 70, 20], "BRITAIN", iconGavel, 110,
    "UK SANCTIONS FIRMS", 5,
    "BRITAIN SANCTIONED FIRMS OVER ISRAELI SETTLEMENTS IN THE WEST BANK TO PROTECT THE TWO-STATE SOLUTION.",
    4, 26);

  // ticker
  fillRect(0, 1856, W, 192, INK);
  fillRect(0, 1856, W, 8, GOLD);
  drawTextC(W / 2, 1876, "ALSO TODAY", 5, GOLD);
  drawTextC(W / 2, 1924, "- MS DHONI RETIRES FROM THE IPL AND BECOMES CHENNAI SUPER KINGS MENTOR", 4, WHITE);
  drawTextC(W / 2, 1970, "- CANADA AND CHINA EXTEND TRADE DEALS AS XI MEETS CARNEY AHEAD OF APEC", 4, WHITE);
  drawTextC(W / 2, 2016 - 4, "- INDIA RE-ELECTED TO THE ITU COUNCIL FOR 2027-2030", 4, WHITE);
}

// ---------- downsample 2048 -> 1024 (2x2 box average) ----------
function downsample(): Uint8Array {
  const S = 1024;
  const out = new Uint8Array(S * S * 3);
  for (let yy = 0; yy < S; yy++)
    for (let xx = 0; xx < S; xx++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const i = ((yy * 2 + dy) * W + (xx * 2 + dx)) * 3;
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2];
        }
      const o = (yy * S + xx) * 3;
      out[o] = Math.round(r / 4); out[o + 1] = Math.round(g / 4); out[o + 2] = Math.round(b / 4);
    }
  return out;
}

// ---------- PNG encoder (CRC32 + zlib deflate) ----------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(out.subarray(4, 8), 0); crcData.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcData));
  return out;
}
function encodePNG(rgb: Uint8Array, size: number): Uint8Array {
  const raw = new Uint8Array(size * (size * 3 + 1));
  for (let yy = 0; yy < size; yy++) {
    raw[yy * (size * 3 + 1)] = 0; // filter: none
    raw.set(rgb.subarray(yy * size * 3, (yy + 1) * size * 3), yy * (size * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size); dv.setUint32(4, size);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", new Uint8Array(idat)), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

// ---------- main ----------
buildPage();
const small = downsample();
const png = encodePNG(small, 1024);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), png);
console.log("wrote entry.png", png.length, "bytes");
