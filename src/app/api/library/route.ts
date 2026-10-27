import { requireReader } from "@/server/auth";
import { getLibrary } from "@/server/data";
import { handle } from "@/server/http";

export const GET = handle(async (req) => {
  const reader = await requireReader();
  const kind = new URL(req.url).searchParams.get("kind");
  return Response.json({ quotes: await getLibrary(reader.id, kind) });
});
