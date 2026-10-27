import { deleteReader, getReader, requireReader } from "@/server/auth";
import { handle, readJson } from "@/server/http";

export const GET = handle(async () => Response.json({ reader: await getReader() }));

// Deletes the reader and everything kotes knows about them.
export const DELETE = handle(async (req) => {
  await readJson(req);
  await deleteReader((await requireReader()).id);
  return Response.json({ ok: true });
});
