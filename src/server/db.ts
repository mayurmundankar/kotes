import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { SUPABASE_CA } from "./supabase-ca.mjs";

// Reuse one pool across hot reloads in development.
const g = globalThis as unknown as { kotesPool?: Pool };

function pool() {
  if (!g.kotesPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const p = new Pool({
      connectionString: url,
      ssl: { ca: SUPABASE_CA },
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      connectionTimeoutMillis: 10_000,
      // Opening a connection costs ~1s (TLS + auth, far away), so keep them,
      // but not forever: links idle for long get dropped by NATs and poolers.
      idleTimeoutMillis: 10 * 60_000,
      // TCP keepalive after 10s idle (the OS default is 2 hours): keeps router
      // NAT entries alive and notices a dead link before a reader's request does.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    // An idle connection dying (network blip, pooler restart) is routine: the
    // pool drops it and opens a fresh one. Without this listener Node treats
    // it as fatal and the whole server exits.
    p.on("error", (e) => console.warn(JSON.stringify({ db: "idle_connection_lost", error: e.message })));
    g.kotesPool = p;
  }
  return g.kotesPool;
}

// The connection was already dead when we used it: safe to try once more.
const isDeadConnection = (e: unknown) => {
  const err = e as { code?: string; message?: string };
  return (
    ["ECONNRESET", "EPIPE", "ETIMEDOUT", "ECONNREFUSED", "57P01", "08006", "08003"].includes(err?.code ?? "") ||
    /Connection terminated|connection error|not queryable|socket hang up|ECONNRESET|EPIPE/i.test(err?.message ?? "")
  );
};

export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  try {
    return (await pool().query<T>(sql, params)).rows;
  } catch (e) {
    if (!isDeadConnection(e)) throw e;
    console.warn(JSON.stringify({ db: "retry_after_dead_connection", error: (e as Error).message }));
    return (await pool().query<T>(sql, params)).rows;
  }
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>, retry = true): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
  } catch (e) {
    // Dead before any work was done: discard this connection and start over.
    c.release(true);
    if (retry && isDeadConnection(e)) return tx(fn, false);
    throw e;
  }
  try {
    const out = await fn(c);
    await c.query("commit");
    c.release();
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    // A failed connection must not go back into the pool for the next request.
    c.release(isDeadConnection(e) ? true : undefined);
    throw e;
  }
}
