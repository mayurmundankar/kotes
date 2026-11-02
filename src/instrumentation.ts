// Runs once when the server starts: fail fast on missing configuration
// instead of on a reader's first sign-in, then open database connections so
// the first readers don't pay for the handshake.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const missing = ["DATABASE_URL", "AUTH_SECRET", "RESEND_API_KEY", "RESEND_FROM"].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`kotes: missing environment variables: ${missing.join(", ")}`);
  if (process.env.AUTH_SECRET!.length < 32) throw new Error("kotes: AUTH_SECRET must be at least 32 characters");
  if (process.env.REVIEW_EMAIL || process.env.REVIEW_CODE) {
    if (!process.env.REVIEW_EMAIL || !/^\d{6}$/.test(process.env.REVIEW_CODE ?? "")) {
      throw new Error("kotes: REVIEW_EMAIL and REVIEW_CODE (6 digits) go together");
    }
    console.warn("kotes: the store review account is on (REVIEW_EMAIL). It signs in with a fixed code and gets no email.");
  }
  try {
    const user = decodeURIComponent(new URL(process.env.DATABASE_URL!).username).split(".")[0];
    if (user !== "kotes_app") {
      console.warn(`kotes: SECURITY WARNING: connected to the database as "${user}". Use the least-privilege kotes_app login (supabase/app-role.sql).`);
    }
  } catch {}

  const { query } = await import("./server/db");
  await Promise.all([query("select 1"), query("select 1")]).catch((e) => console.error("kotes: database warm-up failed", e));
}
