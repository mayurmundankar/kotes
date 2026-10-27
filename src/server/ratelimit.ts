import "server-only";
import { headers } from "next/headers";
import { HttpError } from "./http";

// In-memory sliding windows. Right for a single server; with several
// instances, move this to the database or Redis.
const hits = new Map<string, number[]>();

export function limit(key: string, max: number, windowMs: number, message: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
    throw new HttpError(message, 429, retryAfter);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  }
}

/**
 * The caller's IP. Behind Cloudflare (Tunnel or proxy) that's CF-Connecting-IP;
 * behind nginx/Caddy it's the first X-Forwarded-For hop. Put the app behind one
 * of those: reached directly, a client could spoof these headers to dodge the
 * per-IP limits (the per-email and global limits still hold).
 */
export async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
}
