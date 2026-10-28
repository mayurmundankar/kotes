// Applies supabase/schema.sql and supabase/seed.sql to DATABASE_URL.
// Every step is safe to re-run.
// Usage: npm run db:apply              (schema + quotes)
//        npm run db:apply -- --cleanup (also removes the old Supabase-Auth version)
import { readFileSync } from "node:fs";
import pg from "pg";
import { SUPABASE_CA } from "../src/server/supabase-ca.mjs";

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing from .env.local");
  process.exit(1);
}

// Data fixes run before the seed, so renamed quotes are updated rather than duplicated.
const files = ["schema.sql", "no-em-dashes.sql", "seed.sql"];
if (process.argv.includes("--cleanup")) files.unshift("cleanup-supabase-auth.sql");

const db = new pg.Client({ connectionString: url, ssl: { ca: SUPABASE_CA } });
await db.connect();

try {
  for (const f of files) {
    await db.query(readFileSync(new URL(`../supabase/${f}`, import.meta.url), "utf8"));
    console.log(`✓ ${f}`);
  }
  const { rows } = await db.query("select count(*)::int as n from kotes.quotes");
  console.log(`\n${rows[0].n} quotes in the library.`);
} finally {
  await db.end();
}
