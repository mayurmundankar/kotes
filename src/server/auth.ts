import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { query, tx } from "./db";
import { sendCodeEmail } from "./email";
import { HttpError } from "./http";
import { emailTag, secLog } from "./seclog";
import { OTP_LENGTH as CODE_LENGTH } from "@/lib/backend";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5; // per code
const RESEND_AFTER_S = 60;
const MAX_CODES_PER_HOUR = 5; // per email: slows email bombing
const MAX_CODES_PER_DAY = 10; // per email
// Wrong guesses per email per rolling day, across all its codes. With 6 digits
// this caps a determined attacker at ~0.5% odds per year against one account.
const MAX_FAILURES_PER_DAY = 15;
const MAX_CODES_GLOBAL_PER_HOUR = Number(process.env.MAX_CODES_PER_HOUR ?? 300); // protects the Resend quota
const SESSION_DAYS = 90;
// `__Host-` (HTTPS only): the browser refuses it from any other subdomain of
// mayurmundankar.com, so a sibling site can't plant or overwrite the session.
const SECURE = process.env.NODE_ENV === "production";
const COOKIE = SECURE ? "__Host-kotes_session" : "kotes_session";
const LEGACY_COOKIE = "kotes_session"; // pre-hardening name, migrated on next visit
// Deliberately plain: no quotes, commas, angle brackets or other characters
// that mean something to mail software.
const EMAIL = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9_%+-])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export type Reader = { id: string; email: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return s;
}

const hashCode = (email: string, code: string) => createHmac("sha256", secret()).update(`${email}:${code}`).digest();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function normalizeEmail(raw: unknown) {
  const email = String(raw ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) throw new HttpError("That email doesn't look quite right.");
  return email;
}

/**
 * Store review (Google Play): reviewers can't receive kotes' emails, so one
 * configured account signs in with a fixed code instead, and no email is sent.
 * Off unless both are set. Every limit and lockout still applies, and the
 * account holds nothing but the reviewer's own reading.
 */
export function reviewAccount() {
  const email = process.env.REVIEW_EMAIL?.trim().toLowerCase();
  const code = process.env.REVIEW_CODE?.trim();
  if (!email || !code || !new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) return null;
  return { email, code };
}

/** True when this email has had too many wrong guesses today. */
async function lockedOut(email: string) {
  const [{ failures }] = await query<{ failures: number }>(
    `select coalesce(sum(attempts), 0)::int as failures from kotes.login_codes
     where email = $1 and created_at > now() - interval '1 day'`,
    [email],
  );
  return failures >= MAX_FAILURES_PER_DAY;
}

/** Step one: email a fresh code. Earlier unused codes stop working. */
export async function requestCode(email: string) {
  if (await lockedOut(email)) {
    secLog("locked_out", { email: emailTag(email), step: "code" });
    throw new HttpError("Too many wrong codes today. Try again tomorrow.", 429);
  }
  const recent = await query<{ created_at: Date; last_hour: boolean }>(
    `select created_at, created_at > now() - interval '1 hour' as last_hour from kotes.login_codes
     where email = $1 and created_at > now() - interval '1 day'
     order by created_at desc`,
    [email],
  );
  if (recent.length >= MAX_CODES_PER_DAY) {
    secLog("email_daily_cap", { email: emailTag(email) });
    throw new HttpError("Too many codes asked for today. Try again tomorrow.", 429);
  }
  if (recent.length) {
    const age = (Date.now() - recent[0].created_at.getTime()) / 1000;
    if (age < RESEND_AFTER_S) {
      const wait = Math.ceil(RESEND_AFTER_S - age);
      throw new HttpError(`Give it ${wait}s before asking for another code.`, 429, wait);
    }
  }
  if (recent.filter((r) => r.last_hour).length >= MAX_CODES_PER_HOUR) {
    secLog("email_hourly_cap", { email: emailTag(email) });
    throw new HttpError("Too many codes asked for. Try again in an hour.", 429);
  }
  const [{ n }] = await query<{ n: number }>(
    "select count(*)::int as n from kotes.login_codes where created_at > now() - interval '1 hour'",
  );
  if (n >= MAX_CODES_GLOBAL_PER_HOUR) {
    secLog("global_email_cap", { n });
    throw new HttpError("kotes is very busy right now. Try again shortly.", 503);
  }

  const review = reviewAccount();
  const isReview = review?.email === email;
  const code = isReview ? review.code : String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await query("update kotes.login_codes set used_at = now() where email = $1 and used_at is null", [email]);
  const [row] = await query<{ id: string }>(
    `insert into kotes.login_codes (email, code_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3)) returning id`,
    [email, hashCode(email, code).toString("hex"), CODE_TTL_MIN],
  );

  if (isReview) {
    secLog("review_code", { email: emailTag(email) });
    return;
  }
  try {
    await sendCodeEmail(email, code);
  } catch (e) {
    await query("delete from kotes.login_codes where id = $1", [row.id]);
    secLog("email_send_failed", { email: emailTag(email), error: String((e as Error).message).slice(0, 200) });
    throw new HttpError("We couldn't send the email. Try again shortly.", 502);
  }

  if (Math.random() < 0.05) query("select kotes.sweep()").catch(() => {});
}

/**
 * Step two: trade a correct code for a session. Browsers get it as a cookie;
 * the app (`app`) gets the token itself, keeps it in the device keystore and
 * sends it back as `Authorization: Bearer`.
 */
export async function verifyCode(
  email: string,
  rawCode: unknown,
  userAgent: string | null,
  app = false,
): Promise<{ reader: Reader; token?: string }> {
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (code.length !== CODE_LENGTH) throw new HttpError("That code doesn't look right.");
  if (await lockedOut(email)) {
    secLog("locked_out", { email: emailTag(email), step: "verify" });
    throw new HttpError("Too many wrong codes today. Try again tomorrow.", 429);
  }

  // Resolved inside the transaction, thrown after it commits, so wrong
  // guesses still count against the code.
  const result = await tx(async (c) => {
    const { rows } = await c.query<{ id: string; code_hash: string; attempts: number; expired: boolean }>(
      `select id, code_hash, attempts, expires_at < now() as expired from kotes.login_codes
       where email = $1 and used_at is null
       order by created_at desc limit 1 for update`,
      [email],
    );
    const row = rows[0];
    if (!row || row.expired) return { error: "That code has expired. Send a new one." };
    if (row.attempts >= MAX_ATTEMPTS) return { error: "Too many tries. Send a new code." };

    const ok = timingSafeEqual(Buffer.from(row.code_hash, "hex"), hashCode(email, code));
    if (!ok) {
      await c.query("update kotes.login_codes set attempts = attempts + 1 where id = $1", [row.id]);
      const left = MAX_ATTEMPTS - row.attempts - 1;
      return { error: left > 0 ? "That code didn't work. Check it and try again." : "Too many tries. Send a new code." };
    }

    await c.query("update kotes.login_codes set used_at = now() where id = $1", [row.id]);
    const reader = (
      await c.query<Reader>(
        `insert into kotes.readers (email, last_seen_at) values ($1, now())
         on conflict (email) do update set last_seen_at = now()
         returning id, email`,
        [email],
      )
    ).rows[0];

    const token = randomBytes(32).toString("base64url");
    await c.query(
      `insert into kotes.sessions (token_hash, reader_id, expires_at, user_agent)
       values ($1, $2, now() + make_interval(days => $3), $4)`,
      [hashToken(token), reader.id, SESSION_DAYS, userAgent?.slice(0, 300) ?? null],
    );
    return { reader, token };
  });

  if ("error" in result) {
    secLog("verify_failed", { email: emailTag(email) });
    throw new HttpError(result.error!, 400);
  }
  if (app) return result;
  await setCookie(result.token);
  return { reader: result.reader };
}

async function setCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: SECURE,
    // Strict: never sent on requests started by another site. Safe here because
    // every API call comes from kotes' own pages.
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

/**
 * The session token: the app's bearer token, else the cookie (moving a
 * pre-hardening cookie to the new name). Browsers never send Authorization to
 * kotes, so a bearer token always means the app.
 */
async function readToken(): Promise<{ token?: string; legacy: boolean; bearer: boolean }> {
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return { token: auth.slice(7).trim(), legacy: false, bearer: true };
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token || COOKIE === LEGACY_COOKIE) return { token, legacy: false, bearer: false };
  const old = jar.get(LEGACY_COOKIE)?.value;
  return { token: old, legacy: !!old, bearer: false };
}

// Verified sessions, remembered briefly so most API calls skip a database round
// trip. Single server, so in-memory is enough; sign-out and deletion evict.
const SESSION_CACHE_MS = 60_000;
const sessionCache = new Map<string, { reader: Reader; until: number }>();

/** The signed-in reader, or null. Sessions slide forward once a day. */
export async function getReader(): Promise<Reader | null> {
  const { token, legacy, bearer } = await readToken();
  if (!token || token.length > 100) return null;
  const hash = hashToken(token);
  const hit = sessionCache.get(hash);
  if (hit && hit.until > Date.now()) return hit.reader;

  const [row] = await query<Reader & { stale: boolean }>(
    `select r.id, r.email, s.last_used_at < now() - interval '1 day' as stale
     from kotes.sessions s join kotes.readers r on r.id = s.reader_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hash],
  );
  if (!row) {
    sessionCache.delete(hash);
    return null;
  }
  if (legacy) {
    await setCookie(token);
    (await cookies()).delete(LEGACY_COOKIE);
  }
  if (row.stale) {
    await query(
      `with s as (
         update kotes.sessions set last_used_at = now(), expires_at = now() + make_interval(days => $2)
         where token_hash = $1 returning reader_id
       )
       update kotes.readers set last_seen_at = now() where id in (select reader_id from s)`,
      [hash, SESSION_DAYS],
    );
    // The app's token slides on the server alone; there's no cookie to refresh.
    if (!bearer) await setCookie(token);
  }
  const reader = { id: row.id, email: row.email };
  if (sessionCache.size > 5_000) sessionCache.clear();
  sessionCache.set(hash, { reader, until: Date.now() + SESSION_CACHE_MS });
  return reader;
}

export async function isOnboarded(readerId: string) {
  const [row] = await query<{ ok: boolean }>(
    "select exists (select 1 from kotes.tastes where reader_id = $1) as ok",
    [readerId],
  );
  return row.ok;
}

export async function requireReader() {
  const reader = await getReader();
  if (!reader) throw new HttpError("Sign in first.", 401);
  return reader;
}

export async function signOut() {
  const { token } = await readToken();
  if (token) {
    sessionCache.delete(hashToken(token));
    await query("delete from kotes.sessions where token_hash = $1", [hashToken(token)]);
  }
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(LEGACY_COOKIE);
}

/** Deletes the reader; sessions, taste, likes and views cascade with them. */
export async function deleteReader(id: string) {
  const [row] = await query<{ email: string }>("delete from kotes.readers where id = $1 returning email", [id]);
  if (row) await query("delete from kotes.login_codes where email = $1", [row.email]);
  for (const [k, v] of sessionCache) if (v.reader.id === id) sessionCache.delete(k);
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(LEGACY_COOKIE);
}
