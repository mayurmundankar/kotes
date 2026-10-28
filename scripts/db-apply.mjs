// Applies the database schema, the app's least-privilege role and the quotes.
// Connects as the admin (DATABASE_ADMIN_URL, the `postgres` login); the app
// itself uses DATABASE_URL (the `kotes_app` login). Every step is safe to re-run.
// Usage: npm run db:apply              (schema + quotes)
//        npm run db:apply -- --cleanup (also removes the old Supabase-Auth version)
import { readFileSync } from "node:fs";
import pg from "pg";
import { SUPABASE_CA } from "../src/server/supabase-ca.mjs";

try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
} catch {}

const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_ADMIN_URL is missing from .env.local");
  process.exit(1);
}

// Data fixes run before the seed, so renamed quotes are updated rather than duplicated.
const files = ["schema.sql", "app-role.sql", "no-em-dashes.sql", "seed.sql"];
if (process.argv.includes("--cleanup")) files.unshift("cleanup-supabase-auth.sql");

const db = new pg.Client({ connectionString: url, ssl: { ca: SUPABASE_CA } });
await db.connect();

try {
  for (const f of files) {
    await db.query(readFileSync(new URL(`../supabase/${f}`, import.meta.url), "utf8"));
    console.log(`✓ ${f}`);
  }
  const password = process.env.APP_DB_PASSWORD;
  if (password) {
    if (password.length < 24) throw new Error("APP_DB_PASSWORD must be at least 24 characters");
    await db.query(`alter role kotes_app with login password ${db.escapeLiteral(password)}`);
    console.log("✓ kotes_app can log in");
  } else {
    console.log("· APP_DB_PASSWORD not set: kotes_app left without a login");
  }

  const { rows } = await db.query("select count(*)::int as n from kotes.quotes");
  console.log(`\n${rows[0].n} quotes in the library.`);
} finally {
  await db.end();
}
