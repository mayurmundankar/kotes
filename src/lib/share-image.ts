// Draws a quote as a 1080×1920 story image (Instagram, Facebook, WhatsApp
// status) in the app's own fonts and colours. Runs in the browser on a canvas.
import { themeLabel } from "./themes";

export const SHARE_TONES = ["rose", "wine", "paper", "blush"] as const;
export type ShareTone = (typeof SHARE_TONES)[number];

const PALETTE: Record<ShareTone, { bg: string; ink: string; accent: string; soft: string }> = {
  paper: { bg: "#fff6f7", ink: "#2a0711", accent: "#e8365f", soft: "rgba(42,7,17,0.55)" },
  blush: { bg: "#fdecf0", ink: "#2a0711", accent: "#e8365f", soft: "rgba(42,7,17,0.55)" },
  rose: { bg: "#e8365f", ink: "#fff6f7", accent: "#2a0711", soft: "rgba(255,246,247,0.8)" },
  wine: { bg: "#2a0711", ink: "#fff6f7", accent: "#e8365f", soft: "rgba(246,195,207,0.72)" },
};

const W = 1080;
const H = 1920;
const X = 120; // side margin
// Instagram/WhatsApp cover roughly the top and bottom 250px of a story with
// their own controls, so the header and footer sit inside that.
const TOP = 300;
const BOTTOM = H - 250;
const TEXT_W = W - X * 2;

// next/font exposes each family (with its fallbacks) as a CSS variable.
const family = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "serif";

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderQuoteImage(quote: { id: number; text: string; tags: string[] }, tone: ShareTone) {
  const c = PALETTE[tone];
  const display = family("--font-display");
  const read = family("--font-read");
  const ui = family("--font-ui");
  await Promise.all([
    document.fonts.load(`italic 400 80px ${display}`),
    document.fonts.load(`400 300px ${display}`),
    document.fonts.load(`500 80px ${read}`),
    document.fonts.load(`600 28px ${ui}`),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // Largest size whose wrapped text fits the reading area.
  let size = 120;
  let lines: string[] = [];
  for (; size >= 40; size -= 2) {
    ctx.font = `500 ${size}px ${read}`;
    lines = wrap(ctx, quote.text, TEXT_W);
    if (lines.length * size * 1.18 <= 900) break;
  }
  const lh = size * 1.18;

  // Quote mark, text and accent rule, centred as one block.
  const markH = 150;
  const block = markH + 40 + lines.length * lh + 70;
  let y = Math.max(TOP + 80, (H - block) / 2 - 40);

  ctx.fillStyle = c.accent;
  ctx.font = `400 300px ${display}`;
  ctx.fillText("“", X - 12, y + 230);
  y += markH + 40;

  ctx.fillStyle = c.ink;
  ctx.font = `500 ${size}px ${read}`;
  for (const l of lines) {
    y += lh;
    ctx.fillText(l, X, y - lh * 0.22);
  }

  ctx.fillStyle = c.accent;
  ctx.fillRect(X, y + 50, 84, 3);

  // Header: number and themes, as on the card.
  const label = (text: string, x: number, yy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.font = `600 26px ${ui}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "5px";
    ctx.fillText(text, x, yy);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  };
  ctx.fillStyle = c.accent;
  ctx.font = `italic 400 34px ${display}`;
  const no = `N° ${String(quote.id).padStart(3, "0")}`;
  ctx.fillText(no, X, TOP);
  label(quote.tags.map(themeLabel).join("  ·  ").toUpperCase(), X + ctx.measureText(no).width + 30, TOP - 2, c.soft);

  // Footer: wordmark and address.
  ctx.fillStyle = c.ink;
  ctx.font = `italic 400 76px ${display}`;
  ctx.fillText("kotes", X, BOTTOM - 58);
  const wm = ctx.measureText("kotes").width;
  ctx.fillStyle = c.accent;
  ctx.font = `400 76px ${display}`;
  ctx.fillText(".", X + wm + 2, BOTTOM - 58);
  label(location.host.toUpperCase(), X, BOTTOM, c.soft);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the image"))), "image/png"),
  );
}
