import "server-only";
import { THEMES } from "@/lib/themes";
import type { Kind, Quote, Taste } from "@/lib/backend";
import { query } from "./db";
import { HttpError } from "./http";

type Row = { id: string; body: string; author: string; source: string | null; tags: string[]; liked: boolean; saved: boolean };
const toQuote = (r: Row): Quote => ({
  id: Number(r.id),
  text: r.body,
  author: r.author,
  source: r.source,
  tags: r.tags,
  liked: r.liked,
  saved: r.saved,
});

const quoteId = (v: unknown) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw new HttpError("Unknown quote");
  return n;
};
const kind = (v: unknown): Kind => {
  if (v !== "like" && v !== "save") throw new HttpError("Unknown kind");
  return v;
};

export async function getFeed(reader: string, limit: number, exclude: number[]) {
  const ids = exclude.filter((n) => Number.isSafeInteger(n) && n > 0).slice(-60);
  const rows = await query<Row>("select * from kotes.get_feed($1, $2, $3)", [reader, Math.min(Math.max(limit, 1), 30), ids]);
  return rows.map(toQuote);
}

export async function react(reader: string, id: unknown, k: unknown, on: unknown) {
  const [q, kd] = [quoteId(id), kind(k)];
  if (on) {
    await query(
      "insert into kotes.reactions (reader_id, quote_id, kind) values ($1, $2, $3) on conflict do nothing",
      [reader, q, kd],
    );
  } else {
    await query("delete from kotes.reactions where reader_id = $1 and quote_id = $2 and kind = $3", [reader, q, kd]);
  }
}

// Views arrive in batches from the feed: one database round trip for all of them.
export async function recordViews(reader: string, views: unknown) {
  if (!Array.isArray(views) || views.length === 0) return;
  const batch = views.slice(0, 50) as { quoteId?: unknown; dwellMs?: unknown }[];
  const ids = batch.map((v) => quoteId(v?.quoteId));
  const ms = batch.map((v) => Math.min(Math.max(Math.round(Number(v?.dwellMs) || 0), 0), 3_600_000));
  await query(
    "select kotes.record_view($1, v.q, v.d) from unnest($2::bigint[], $3::int[]) as v(q, d)",
    [reader, ids, ms],
  );
}

export async function getLibrary(reader: string, k: unknown) {
  const rows = await query<Row>("select * from kotes.get_library($1, $2)", [reader, kind(k)]);
  return rows.map(toQuote);
}

export async function getTaste(reader: string): Promise<Taste[]> {
  return query<Taste>(
    "select feature, weight from kotes.tastes where reader_id = $1 order by weight desc",
    [reader],
  );
}

export async function setTastes(reader: string, themes: unknown) {
  const known = new Set(THEMES.map((t) => t.id));
  const picked = Array.isArray(themes) ? [...new Set(themes.filter((t): t is string => known.has(t)))] : [];
  if (picked.length < 3) throw new HttpError("Pick at least three themes.");
  await query("select kotes.set_tastes($1, $2)", [reader, picked]);
}
