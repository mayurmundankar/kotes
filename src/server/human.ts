import "server-only";
import { HttpError } from "./http";
import { secLog } from "./seclog";

// Cloudflare Turnstile: proves a sign-in request comes from a person, not a bot
// or AI agent. Switched on by setting both keys (Cloudflare → Turnstile).
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY ?? "";
const secret = () => process.env.TURNSTILE_SECRET_KEY ?? "";

export async function verifyHuman(token: unknown, ip: string) {
  if (!secret()) return; // not configured (local development)
  if (typeof token !== "string" || !token || token.length > 2048) {
    secLog("turnstile_missing", { ip });
    throw new HttpError("Please confirm you're human.", 403);
  }
  let outcome: { success: boolean; "error-codes"?: string[]; action?: string };
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: secret(), response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    outcome = await res.json();
  } catch {
    // Fail closed: if the check can't run, no code is sent.
    throw new HttpError("Couldn't confirm you're human. Try again.", 503);
  }
  if (!outcome.success || (outcome.action && outcome.action !== "signin")) {
    secLog("turnstile_failed", { ip, errors: outcome["error-codes"] });
    throw new HttpError("Please confirm you're human.", 403);
  }
}
