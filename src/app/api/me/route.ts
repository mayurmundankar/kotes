import { deleteReader, getReader, isOnboarded, requireReader } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { limitIp } from "@/server/ratelimit";

// The session and whether onboarding is done, in one request.
export const GET = handle(async () => {
  await limitIp("me", 600, 10 * 60_000);
  const reader = await getReader();
  return Response.json({ reader, onboarded: reader ? await isOnboarded(reader.id) : false });
});

// Deletes the reader and everything kotes knows about them.
export const DELETE = handle(async (req) => {
  await limitIp("delete", 10, 60 * 60_000);
  await readJson(req);
  await deleteReader((await requireReader()).id);
  return Response.json({ ok: true });
});
