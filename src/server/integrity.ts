import "server-only";
import { createHash, createSign } from "node:crypto";
import { HttpError } from "./http";
import { emailTag, secLog } from "./seclog";
import { ANDROID_PACKAGE, integrityRequest } from "@/lib/integrity";

// Google Play Integrity: the Android app's human check, in place of Turnstile.
// It proves a sign-in request comes from the genuine kotes app, installed from
// Google Play, on a real device. Switched on by setting both settings below
// (Google Cloud → service account with the Play Integrity API; the project must
// be linked in Play Console → App integrity).

const PROJECT_NUMBER = () => process.env.PLAY_INTEGRITY_PROJECT_NUMBER ?? "";
// Lets builds not installed from Google Play (development builds, emulators)
// sign in. Never set on the production server.
const ALLOW_TEST_BUILDS = () => process.env.PLAY_INTEGRITY_ALLOW_TEST_BUILDS === "1";
const MAX_AGE_MS = 5 * 60_000;
const SCOPE = "https://www.googleapis.com/auth/playintegrity";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type ServiceAccount = { client_email: string; private_key: string };

/** The service account key: the JSON file Google issues, as is or base64-encoded. */
function serviceAccount(): ServiceAccount | null {
  const raw = process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return json.client_email && json.private_key ? json : null;
  } catch {
    return null;
  }
}

export const appCheckEnabled = () => !!PROJECT_NUMBER() && !!serviceAccount();
/** What the app needs to ask Google for a token (public: it's in every app build). */
export const appCheckConfig = () =>
  appCheckEnabled() ? { packageName: ANDROID_PACKAGE, cloudProjectNumber: PROJECT_NUMBER() } : null;

// Google access tokens last an hour; one is shared by every sign-in until then.
let access: { token: string; until: number } | null = null;

async function accessToken(sa: ServiceAccount) {
  if (access && access.until > Date.now()) return access.token;
  const now = Math.floor(Date.now() / 1000);
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`google token ${res.status}`);
  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  access = { token: access_token, until: Date.now() + (expires_in - 120) * 1000 };
  return access_token;
}

export type IntegrityPayload = {
  requestDetails?: { requestPackageName?: string; requestHash?: string; timestampMillis?: string };
  appIntegrity?: { appRecognitionVerdict?: string; packageName?: string };
  deviceIntegrity?: { deviceRecognitionVerdict?: string[] };
};

/** Why Google's verdict doesn't pass, or null when it does. */
export function verdictProblem(p: IntegrityPayload, email: string, now: number, allowTestBuilds: boolean) {
  const req = p.requestDetails;
  if (req?.requestPackageName !== ANDROID_PACKAGE) return "package";
  if (req.requestHash !== createHash("sha256").update(integrityRequest(email)).digest("hex")) return "request_hash";
  const age = now - Number(req.timestampMillis);
  if (!(age < MAX_AGE_MS && age > -60_000)) return "stale";

  const app = p.appIntegrity?.appRecognitionVerdict;
  if (app !== "PLAY_RECOGNIZED" && !(allowTestBuilds && app === "UNRECOGNIZED_VERSION")) return `app:${app}`;
  const device = p.deviceIntegrity?.deviceRecognitionVerdict ?? [];
  const genuine = device.includes("MEETS_DEVICE_INTEGRITY") || device.includes("MEETS_STRONG_INTEGRITY");
  const test = device.includes("MEETS_BASIC_INTEGRITY") || device.includes("MEETS_VIRTUAL_INTEGRITY");
  if (!genuine && !(allowTestBuilds && test)) return `device:${device.join("+") || "none"}`;
  return null;
}

export async function verifyApp(token: unknown, email: string, ip: string) {
  const sa = serviceAccount();
  if (!sa) throw new HttpError("The app can't sign in right now. Try again shortly.", 503);
  if (typeof token !== "string" || !token || token.length > 8192) {
    secLog("integrity_missing", { ip });
    throw new HttpError("This device couldn't be verified. Install kotes from Google Play and try again.", 403);
  }
  let payload: IntegrityPayload;
  try {
    const res = await fetch(`https://playintegrity.googleapis.com/v1/${ANDROID_PACKAGE}:decodeIntegrityToken`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ integrity_token: token }),
      signal: AbortSignal.timeout(5000),
    });
    // 400: a malformed or forged token. Anything else is Google or our setup.
    if (res.status === 400) payload = {};
    else if (!res.ok) throw new Error(`decode ${res.status}`);
    else payload = ((await res.json()) as { tokenPayloadExternal: IntegrityPayload }).tokenPayloadExternal;
  } catch (e) {
    // Fail closed: if the check can't run, no code is sent.
    secLog("integrity_unavailable", { ip, error: String((e as Error).message).slice(0, 200) });
    throw new HttpError("Couldn't check this device. Try again.", 503);
  }
  const problem = verdictProblem(payload, email, Date.now(), ALLOW_TEST_BUILDS());
  if (problem) {
    secLog("integrity_failed", { ip, email: emailTag(email), problem });
    throw new HttpError("This device couldn't be verified. Install kotes from Google Play and try again.", 403);
  }
}
