import { normalizeEmail, requestCode } from "@/server/auth";
import { verifyHuman } from "@/server/human";
import { appCheckEnabled, verifyApp } from "@/server/integrity";
import { handle, readJson } from "@/server/http";
import { limitIp } from "@/server/ratelimit";
import { secLog } from "@/server/seclog";

type Body = { email: string; turnstile: string; website: string; automated: boolean; platform: string; integrity: string };

export const POST = handle(async (req) => {
  const ip = await limitIp("code", 20, 60 * 60_000, "Too many codes from this network. Try again later.");
  const body = await readJson<Body>(req);

  // Bot signals get a quiet "sent" so they learn nothing: the honeypot field
  // (hidden from people, filled by form bots) and the browser's own flag for
  // being remote-controlled (Selenium, Playwright, Puppeteer, most AI agents).
  if (body.website || body.automated === true) {
    secLog(body.website ? "honeypot" : "automation_flag", { ip });
    return Response.json({ ok: true });
  }

  const email = normalizeEmail(body.email);
  // The Android app proves itself with Play Integrity. Until that's set up,
  // claiming to be the app gets the Turnstile check like anyone else, so it
  // can't be used to skip it.
  if (body.platform === "android" && appCheckEnabled()) await verifyApp(body.integrity, email, ip);
  else await verifyHuman(body.turnstile, ip);
  await requestCode(email);
  return Response.json({ ok: true });
});
