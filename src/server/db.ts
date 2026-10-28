import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { SUPABASE_CA } from "./supabase-ca.mjs";

// Reuse one pool across hot reloads in development.
const g = globalThis as unknown as { kotesPool?: Pool };

function pool() {
  if (!g.kotesPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.kotesPool = new Pool({
      connectionString: url,
      ssl: { ca: SUPABASE_CA },
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      connectionTimeoutMillis: 10_000,
      // Opening a connection costs ~1s (TLS + auth, far away); keep them open.
      idleTimeoutMillis: 0,
      keepAlive: true,
    });
  }
  return g.kotesPool;
}

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  return (await pool().query<T>(sql, params)).rows;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>) {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
