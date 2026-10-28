import { requireReader } from "@/server/auth";
import { getLibrary } from "@/server/data";
import { handle } from "@/server/http";
import { limitIp, limitReader } from "@/server/ratelimit";

export const GET = handle(async (req) => {
  await limitIp("library", 600, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "library");
  const kind = new URL(req.url).searchParams.get("kind");
  return Response.json({ quotes: await getLibrary(reader.id, kind) });
});
