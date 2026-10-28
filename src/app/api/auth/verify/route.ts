import { isOnboarded, normalizeEmail, verifyCode } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  await limitIp("verify", 30, 10 * 60_000, "Too many tries. Wait a few minutes.");
  const { email, code } = await readJson<{ email: string; code: string }>(req);
  const reader = await verifyCode(normalizeEmail(email), code, req.headers.get("user-agent"));
  return Response.json({ reader, onboarded: await isOnboarded(reader.id) });
});
