import { requireReader } from "@/server/auth";
import { getFeed } from "@/server/data";
import { handle } from "@/server/http";
import { limitIp, limitReader } from "@/server/ratelimit";

export const GET = handle(async (req) => {
  await limitIp("feed", 600, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "feed");
  const params = new URL(req.url).searchParams;
  const exclude = (params.get("exclude") ?? "").split(",", 60).filter(Boolean).map(Number);
  return Response.json({ quotes: await getFeed(reader.id, Number(params.get("limit") ?? 8), exclude) });
});
