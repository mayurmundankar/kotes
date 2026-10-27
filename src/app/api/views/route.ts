import { requireReader } from "@/server/auth";
import { recordView } from "@/server/data";
import { handle, readJson } from "@/server/http";

export const POST = handle(async (req) => {
  const reader = await requireReader();
  const { quoteId, dwellMs } = await readJson<{ quoteId: number; dwellMs: number }>(req);
  await recordView(reader.id, quoteId, dwellMs);
  return Response.json({ ok: true });
});
