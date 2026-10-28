import "server-only";
import { connection } from "next/server";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

const MAX_BODY_BYTES = 16 * 1024;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * State-changing requests must come from kotes' own pages. Browsers send
 * Sec-Fetch-Site and Origin on every POST/PUT/DELETE; a request started by
 * another site (or framed, or from an extension page) is refused. Together
 * with JSON-only bodies and the SameSite=Strict cookie, this is three
 * independent layers against cross-site request forgery.
 */
function assertSameOrigin(req: Request) {
  if (SAFE_METHODS.has(req.method)) return;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") throw new HttpError("Cross-site request refused.", 403);
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {}
    if (!host || originHost !== host) throw new HttpError("Cross-site request refused.", 403);
  }
}

// Wraps a route handler: same-origin check, then known errors become JSON and
// anything else is logged without leaking details to the client.
export function handle<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    // Every API call is per-reader: never prerender. Outside the try so Next's
    // prerender signal isn't swallowed.
    await connection();
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        const headers = e.retryAfter ? { "Retry-After": String(e.retryAfter) } : undefined;
        return Response.json({ error: e.message, retryAfter: e.retryAfter }, { status: e.status, headers });
      }
      console.error(e);
      return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

// JSON only (cross-site HTML forms can't send it) and small (no memory floods).
export async function readJson<T>(req: Request): Promise<Partial<T>> {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new HttpError("Expected JSON", 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new HttpError("Request too large", 413);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError("Request too large", 413);
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Partial<T>;
  } catch {
    throw new HttpError("Malformed JSON");
  }
}
