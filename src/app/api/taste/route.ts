import { requireReader } from "@/server/auth";
import { getTaste, setTastes } from "@/server/data";
import { handle, readJson } from "@/server/http";

export const GET = handle(async () => {
  const reader = await requireReader();
  return Response.json({ taste: await getTaste(reader.id) });
});

export const PUT = handle(async (req) => {
  const reader = await requireReader();
  const { themes } = await readJson<{ themes: string[] }>(req);
  await setTastes(reader.id, themes);
  return Response.json({ ok: true });
});
