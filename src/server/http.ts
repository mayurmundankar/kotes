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

// Wraps a route handler: known errors become JSON, anything else is logged.
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    // Every API call is per-reader: never prerender. Outside the try so Next's
    // prerender signal isn't swallowed.
    await connection();
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) {
        return Response.json({ error: e.message, retryAfter: e.retryAfter }, { status: e.status });
      }
      console.error(e);
      return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

// Requiring a JSON body also blocks cross-site form posts (they can't send JSON).
export async function readJson<T>(req: Request): Promise<Partial<T>> {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new HttpError("Expected JSON", 415);
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    throw new HttpError("Malformed JSON");
  }
}
