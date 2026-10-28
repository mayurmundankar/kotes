import { handle, readJson } from "@/server/http";
import { limitIp } from "@/server/ratelimit";
import { secLog } from "@/server/seclog";

// Unexpected errors from readers' browsers, so phone-only bugs show up in the
// server log with the browser and the actual error. Bounded and rate-limited.
export const POST = handle(async (req) => {
  const ip = await limitIp("client-error", 20, 10 * 60_000);
  const { where, message } = await readJson<{ where: string; message: string }>(req);
  secLog("client_error", {
    ip,
    where: String(where ?? "").slice(0, 60),
    message: String(message ?? "").slice(0, 300),
    ua: (req.headers.get("user-agent") ?? "").slice(0, 200),
  });
  return Response.json({ ok: true });
});
