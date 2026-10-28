import { query } from "@/server/db";
import { handle } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

// For Docker / uptime checks: is the server up and can it reach the database?
export const GET = handle(async () => {
  await limitIp("health", 60, 60_000);
  try {
    await query("select 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
});
