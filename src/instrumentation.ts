// Runs once when the server starts: fail fast on missing configuration
// instead of on a reader's first sign-in.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const missing = ["DATABASE_URL", "AUTH_SECRET", "RESEND_API_KEY", "RESEND_FROM"].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`kotes: missing environment variables: ${missing.join(", ")}`);
  if (process.env.AUTH_SECRET!.length < 32) throw new Error("kotes: AUTH_SECRET must be at least 32 characters");
}
