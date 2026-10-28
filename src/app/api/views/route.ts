import { requireReader } from "@/server/auth";
import { recordViews } from "@/server/data";
import { handle, readJson } from "@/server/http";

export const POST = handle(async (req) => {
  const reader = await requireReader();
  const { views } = await readJson<{ views: { quoteId: number; dwellMs: number }[] }>(req);
  await recordViews(reader.id, views);
  return Response.json({ ok: true });
});
