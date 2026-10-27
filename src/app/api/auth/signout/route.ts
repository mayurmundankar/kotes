import { signOut } from "@/server/auth";
import { handle, readJson } from "@/server/http";

export const POST = handle(async (req) => {
  await readJson(req);
  await signOut();
  return Response.json({ ok: true });
});
