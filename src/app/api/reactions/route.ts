import { requireReader } from "@/server/auth";
import { react } from "@/server/data";
import { handle, readJson } from "@/server/http";
import { limitIp, limitReader } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  await limitIp("reactions", 1200, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "reactions");
  const { quoteId, kind, on } = await readJson<{ quoteId: number; kind: string; on: boolean }>(req);
  await react(reader.id, quoteId, kind, on === true);
  return Response.json({ ok: true });
});
