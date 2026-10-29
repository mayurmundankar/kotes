import { turnstileSiteKey } from "@/server/human";
import { appCheckConfig } from "@/server/integrity";
import { handle } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

// Public settings the sign-in page and the app need at runtime (no rebuild to change them).
export const GET = handle(async () => {
  await limitIp("config", 60, 60_000);
  return Response.json({ turnstileSiteKey: turnstileSiteKey() || null, android: appCheckConfig() });
});
