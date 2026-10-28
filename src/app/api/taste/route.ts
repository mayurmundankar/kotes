import { requireReader } from "@/server/auth";
import { getTaste, setTastes } from "@/server/data";
import { handle, readJson } from "@/server/http";
import { limitIp, limitReader } from "@/server/ratelimit";

export const GET = handle(async () => {
  await limitIp("taste", 600, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "taste");
  return Response.json({ taste: await getTaste(reader.id) });
});

export const PUT = handle(async (req) => {
  await limitIp("taste", 600, 10 * 60_000);
  const reader = await requireReader();
  limitReader(reader.id, "taste");
  const { themes } = await readJson<{ themes: string[] }>(req);
  await setTastes(reader.id, themes);
  return Response.json({ ok: true });
});
