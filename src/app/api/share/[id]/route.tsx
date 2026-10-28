import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { requireReader } from "@/server/auth";
import { query } from "@/server/db";
import { handle, HttpError } from "@/server/http";
import { limitIp, limitReader } from "@/server/ratelimit";
import { themeLabel } from "@/lib/themes";
import { isShareTone, PALETTE } from "@/lib/tones";

// Story image for sharing (1080×1920: Instagram, Facebook, WhatsApp status),
// drawn on the server so it works in every browser. Some phone browsers block
// or break canvas drawing (Edge on Android among them).

const W = 1080;
const H = 1920;
const X = 120;
// Stories cover roughly the top and bottom 250px with their own controls.
const TOP = 250;
const BOTTOM = 250;

// TrueType copies built by scripts/build-fonts.py; read once per server start.
const font = (file: string) => readFile(join(process.cwd(), "src/fonts/og", file));
const fonts = Promise.all([
  font("dmserif-400.ttf"),
  font("dmserif-400-italic.ttf"),
  font("garamond-500.ttf"),
  font("manrope-600.ttf"),
]).then(([display, displayItalic, read, ui]) => [
  { name: "display", data: display, weight: 400 as const, style: "normal" as const },
  { name: "display", data: displayItalic, weight: 400 as const, style: "italic" as const },
  { name: "read", data: read, weight: 500 as const, style: "normal" as const },
  { name: "ui", data: ui, weight: 600 as const, style: "normal" as const },
]);

// Largest size whose wrapped text fits the reading area. EB Garamond averages
// about 0.46em per character, which is close enough to pick a size.
function sizeFor(text: string) {
  for (let size = 120; size > 40; size -= 2) {
    const perLine = Math.floor((W - X * 2) / (size * 0.46));
    const lines = text.split(/\s+/).reduce(
      (acc, word) => {
        const last = acc[acc.length - 1];
        if (last && (last + " " + word).length <= perLine) acc[acc.length - 1] = last + " " + word;
        else acc.push(word);
        return acc;
      },
      [] as string[],
    ).length;
    if (lines * size * 1.18 <= 900) return size;
  }
  return 40;
}

export const GET = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await limitIp("share", 120, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "share");

  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError("Unknown quote", 404);
  const toneParam = new URL(req.url).searchParams.get("tone");
  const c = PALETTE[isShareTone(toneParam) ? toneParam : "rose"];

  const [quote] = await query<{ id: string; body: string; tags: string[] }>(
    "select id, body, tags from kotes.quotes where id = $1",
    [id],
  );
  if (!quote) throw new HttpError("Unknown quote", 404);
  const size = sizeFor(quote.body);
  const no = `N° ${String(quote.id).padStart(3, "0")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${TOP}px ${X}px ${BOTTOM}px`,
          background: c.bg,
          color: c.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
          <span style={{ fontFamily: "display", fontStyle: "italic", fontSize: 34, color: c.accent }}>{no}</span>
          <span style={{ fontFamily: "ui", fontSize: 26, letterSpacing: 5, color: c.soft }}>
            {quote.tags.map(themeLabel).join("  ·  ").toUpperCase()}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "display", fontSize: 300, lineHeight: 0.6, height: 150, color: c.accent, marginLeft: -12 }}>
            “
          </span>
          <div style={{ display: "flex", marginTop: 40, fontFamily: "read", fontSize: size, lineHeight: 1.18 }}>
            {quote.body}
          </div>
          <div style={{ display: "flex", width: 84, height: 3, marginTop: 56, background: c.accent }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontFamily: "display", fontStyle: "italic", fontSize: 76, lineHeight: 1 }}>
            kotes<span style={{ fontStyle: "normal", color: c.accent }}>.</span>
          </div>
          <span style={{ fontFamily: "ui", fontSize: 26, letterSpacing: 5, color: c.soft }}>
            {new URL(process.env.SITE_URL ?? "https://kotes.mayurmundankar.com").host.toUpperCase()}
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: await fonts,
      headers: { "Cache-Control": "private, max-age=86400" },
    },
  );
});
