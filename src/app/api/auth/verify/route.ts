import { normalizeEmail, verifyCode } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { clientIp, limit } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  limit(`verify:${await clientIp()}`, 30, 10 * 60_000, "Too many tries. Wait a few minutes.");
  const { email, code } = await readJson<{ email: string; code: string }>(req);
  const reader = await verifyCode(normalizeEmail(email), code, req.headers.get("user-agent"));
  return Response.json({ reader });
});
