import { requireReader } from "@/server/auth";
import { react } from "@/server/data";
import { handle, readJson } from "@/server/http";

export const POST = handle(async (req) => {
  const reader = await requireReader();
  const { quoteId, kind, on } = await readJson<{ quoteId: number; kind: string; on: boolean }>(req);
  await react(reader.id, quoteId, kind, on === true);
  return Response.json({ ok: true });
});
