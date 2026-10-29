import { isOnboarded, normalizeEmail, verifyCode } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  await limitIp("verify", 30, 10 * 60_000, "Too many tries. Wait a few minutes.");
  const { email, code, platform } = await readJson<{ email: string; code: string; platform: string }>(req);
  // The app has no cookie jar: it gets the session token in the body instead.
  const { reader, token } = await verifyCode(normalizeEmail(email), code, req.headers.get("user-agent"), platform === "android");
  return Response.json({ reader, onboarded: await isOnboarded(reader.id), ...(token && { token }) });
});
