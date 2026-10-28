import { requireReader } from "@/server/auth";
import { recordViews } from "@/server/data";
import { handle, readJson } from "@/server/http";
import { limitIp, limitReader } from "@/server/ratelimit";

export const POST = handle(async (req) => {
  await limitIp("views", 600, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "views");
  const { views } = await readJson<{ views: { quoteId: number; dwellMs: number }[] }>(req);
  await recordViews(reader.id, views);
  return Response.json({ ok: true });
});
