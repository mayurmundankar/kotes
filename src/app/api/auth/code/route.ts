import { normalizeEmail, requestCode } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { clientIp, limit } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  limit(`code:${await clientIp()}`, 10, 60 * 60_000, "Too many codes from this network. Try again later.");
  const { email } = await readJson<{ email: string }>(req);
  await requestCode(normalizeEmail(email));
  return Response.json({ ok: true });
});
