import { requireReader } from "@/server/auth";
import { getFeed } from "@/server/data";
import { handle } from "@/server/http";

export const GET = handle(async (req) => {
  const reader = await requireReader();
  const params = new URL(req.url).searchParams;
  const exclude = (params.get("exclude") ?? "").split(",").filter(Boolean).map(Number);
  return Response.json({ quotes: await getFeed(reader.id, Number(params.get("limit") ?? 8), exclude) });
});
