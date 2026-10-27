import "server-only";
import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { query, tx } from "./db";
import { sendCodeEmail } from "./email";
import { HttpError } from "./http";
import { OTP_LENGTH as CODE_LENGTH } from "@/lib/backend";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5; // per code
const RESEND_AFTER_S = 60;
const MAX_CODES_PER_HOUR = 5; // per email
const MAX_CODES_GLOBAL_PER_HOUR = Number(process.env.MAX_CODES_PER_HOUR ?? 300); // protects the Resend quota
const SESSION_DAYS = 90;
const COOKIE = "kotes_session";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

/** Step one: email a fresh code. Earlier unused codes stop working. */
export async function requestCode(email: string) {
  const recent = await query<{ created_at: Date }>(
    `select created_at from kotes.login_codes
     where email = $1 and created_at > now() - interval '1 hour'
     order by created_at desc`,
    [email],
  );
  if (recent.length) {
    const age = (Date.now() - recent[0].created_at.getTime()) / 1000;
    if (age < RESEND_AFTER_S) {
      const wait = Math.ceil(RESEND_AFTER_S - age);
      throw new HttpError(`Give it ${wait}s before asking for another code.`, 429, wait);
    }
  }
  if (recent.length >= MAX_CODES_PER_HOUR) throw new HttpError("Too many codes asked for. Try again in an hour.", 429);
  const [{ n }] = await query<{ n: number }>(
    "select count(*)::int as n from kotes.login_codes where created_at > now() - interval '1 hour'",
  );
  if (n >= MAX_CODES_GLOBAL_PER_HOUR) throw new HttpError("kotes is very busy right now. Try again shortly.", 503);

  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await query("update kotes.login_codes set used_at = now() where email = $1 and used_at is null", [email]);
  const [row] = await query<{ id: string }>(
    `insert into kotes.login_codes (email, code_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3)) returning id`,
    [email, hashCode(email, code).toString("hex"), CODE_TTL_MIN],
  );

  try {
    await sendCodeEmail(email, code);
  } catch (e) {
    await query("delete from kotes.login_codes where id = $1", [row.id]);
    console.error(e);
    throw new HttpError("We couldn't send the email. Try again shortly.", 502);
  }

  if (Math.random() < 0.05) query("select kotes.sweep()").catch(() => {});
}

/** Step two: trade a correct code for a session cookie. */
export async function verifyCode(email: string, rawCode: unknown, userAgent: string | null): Promise<Reader> {
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (code.length !== CODE_LENGTH) throw new HttpError("That code doesn't look right.");

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

  if ("error" in result) throw new HttpError(result.error!, 400);
  await setCookie(result.token);
  return result.reader;
}

async function setCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

/** The signed-in reader, or null. Sessions slide forward once a day. */
export async function getReader(): Promise<Reader | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await query<Reader & { stale: boolean }>(
    `select r.id, r.email, s.last_used_at < now() - interval '1 day' as stale
     from kotes.sessions s join kotes.readers r on r.id = s.reader_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  if (!row) return null;
  if (row.stale) {
    await query(
      `update kotes.sessions set last_used_at = now(), expires_at = now() + make_interval(days => $2)
       where token_hash = $1`,
      [hashToken(token), SESSION_DAYS],
    );
    await query("update kotes.readers set last_seen_at = now() where id = $1", [row.id]);
    await setCookie(token);
  }
  return { id: row.id, email: row.email };
}

export async function requireReader() {
  const reader = await getReader();
  if (!reader) throw new HttpError("Sign in first.", 401);
  return reader;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("delete from kotes.sessions where token_hash = $1", [hashToken(token)]);
  jar.delete(COOKIE);
}

/** Deletes the reader; sessions, taste, likes and views cascade with them. */
export async function deleteReader(id: string) {
  const [row] = await query<{ email: string }>("delete from kotes.readers where id = $1 returning email", [id]);
  if (row) await query("delete from kotes.login_codes where email = $1", [row.email]);
  (await cookies()).delete(COOKIE);
}
