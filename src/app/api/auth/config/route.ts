import { turnstileSiteKey } from "@/server/human";
import { handle } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

// Public settings the sign-in page needs at runtime (no rebuild to change them).
export const GET = handle(async () => {
  await limitIp("config", 60, 60_000);
  return Response.json({ turnstileSiteKey: turnstileSiteKey() || null });
});
