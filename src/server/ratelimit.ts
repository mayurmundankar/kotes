import "server-only";
import { headers } from "next/headers";
import { HttpError } from "./http";
import { secLog } from "./seclog";

// In-memory sliding windows. Right for a single server; with several
// instances, move this to the database or Redis.
const hits = new Map<string, number[]>();
const logged = new Map<string, number>();

export function limit(key: string, max: number, windowMs: number, message = "Slow down a little.") {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    // Log once per window, not on every refused request during a flood.
    if (now - (logged.get(key) ?? 0) > windowMs) {
      secLog("rate_limited", { key });
      logged.set(key, now);
    }
    hits.set(key, recent);
    throw new HttpError(message, 429, Math.ceil((recent[0] + windowMs - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 20_000) {
    for (const [k, v] of hits) if (now - v[v.length - 1] > 60 * 60_000) hits.delete(k);
    for (const [k, t] of logged) if (now - t > 60 * 60_000) logged.delete(k);
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

const MIN = 60_000;

/** Per-IP limit for one route: a ceiling for anyone, signed in or not. */
export async function limitIp(route: string, max: number, windowMs: number, message?: string) {
  const ip = await clientIp();
  limit(`${route}:ip:${ip}`, max, windowMs, message);
  return ip;
}

/**
 * Per-reader limits, set well above what a person can do by hand. A reader
 * spends seconds on each quote; a scraper or agent pulling the library
 * thousands of quotes at a time hits these quickly.
 */
export const READER_LIMITS = {
  feed: [40, 10 * MIN], // 320 quotes per 10 minutes
  reactions: [120, 10 * MIN],
  views: [60, 10 * MIN], // batches of up to 8
  library: [60, 10 * MIN],
  taste: [60, 10 * MIN],
} as const;

export function limitReader(readerId: string, route: keyof typeof READER_LIMITS) {
  const [max, windowMs] = READER_LIMITS[route];
  limit(`${route}:reader:${readerId}`, max, windowMs);
}
