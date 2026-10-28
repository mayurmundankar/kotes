import "server-only";
import { createHmac } from "node:crypto";

// One JSON line per security event (rate limits, failed checks, lockouts), for
// `docker logs kotes | grep '"sec"'`. Emails are pseudonymised: the same address
// always maps to the same tag, but the tag can't be turned back into it.
export function secLog(event: string, data: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ sec: event, at: new Date().toISOString(), ...data }));
}

export const emailTag = (email: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "kotes").update(email).digest("hex").slice(0, 12);
