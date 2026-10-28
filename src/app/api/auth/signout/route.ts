import { signOut } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  await limitIp("signout", 30, 10 * 60_000);
  await readJson(req);
  await signOut();
  return Response.json({ ok: true });
});
