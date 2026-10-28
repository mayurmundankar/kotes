import { deleteReader, getReader, isOnboarded, requireReader } from "@/server/auth";
import { handle, readJson } from "@/server/http";

// The session and whether onboarding is done, in one request.
export const GET = handle(async () => {
  const reader = await getReader();
  return Response.json({ reader, onboarded: reader ? await isOnboarded(reader.id) : false });
});

// Deletes the reader and everything kotes knows about them.
export const DELETE = handle(async (req) => {
  await readJson(req);
  await deleteReader((await requireReader()).id);
  return Response.json({ ok: true });
});
