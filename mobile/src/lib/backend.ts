// The app's view of the kotes API (src/app/api), the counterpart of the web's
// src/lib/backend.ts. The web holds its session in an HttpOnly cookie; the app
// holds the token in the Android Keystore and sends it as a bearer token.
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import type { Kind, Quote, Session, Taste, User } from '@shared/types';
import { appCheckToken, prepareAppCheck, type AppCheck } from './integrity';
import { storage } from './storage';

export type { Kind, Quote, Session, Taste, User };
export { OTP_LENGTH } from '@shared/types';

// Android builds call the live site (eas.json). The web preview has no env set
// and uses its own origin, which Metro forwards to the local server.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '' : 'https://kotes.mayurmundankar.com');
const TOKEN_KEY = 'kotes.token';
const VERSION = Constants.expoConfig?.version ?? '0';
// Shows up in the server's security and error logs next to browser names.
const AGENT = `kotes-android/${VERSION} (Android ${Platform.Version})`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

let token: string | null | undefined; // undefined: not read from the keystore yet
const readToken = async () => (token === undefined ? (token = await storage.get(TOKEN_KEY)) : token);
async function saveToken(next: string | null) {
  token = next;
  if (next) await storage.set(TOKEN_KEY, next);
  else await storage.remove(TOKEN_KEY);
}

const listeners = new Set<(s: Session | null) => void>();
const emit = (s: Session | null) => listeners.forEach((cb) => cb(s));

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const auth = await readToken();
  const headers: Record<string, string> = {};
  if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (Platform.OS !== 'web') headers['User-Agent'] = AGENT;
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/${path}`, {
      method: init?.method ?? (init?.body === undefined ? 'GET' : 'POST'),
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      // Never send the web preview's cookies; the bearer token is the session.
      credentials: 'omit',
    });
  } catch {
    throw new ApiError("Couldn't reach kotes. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The session ended elsewhere (signed out, expired, deleted): back to sign in.
    if (res.status === 401 && auth) {
      await saveToken(null);
      emit(null);
    }
    // No JSON error means kotes itself didn't answer: Cloudflare's own error
    // page while the server restarts or is unreachable.
    const fallback =
      res.status >= 500 ? 'kotes is taking a breath. Try again in a moment.' : 'Something went wrong. Try again.';
    throw new ApiError(data.error ?? fallback, res.status, data.retryAfter);
  }
  return data as T;
}

// Views are sent in batches: every few seconds, every 8, or when the app goes
// to the background.
const VIEW_BATCH = 8;
const VIEW_FLUSH_MS = 5000;
let views: { quoteId: number; dwellMs: number }[] = [];
let viewTimer: ReturnType<typeof setTimeout> | undefined;

function flushViews() {
  clearTimeout(viewTimer);
  viewTimer = undefined;
  if (!views.length) return;
  const batch = views;
  views = [];
  api('views', { body: { views: batch } }).catch(() => {});
}

AppState.addEventListener('change', (state) => state !== 'active' && flushViews());

/** Sends an unexpected app error to the server log. Never throws. */
export function reportError(where: string, err: unknown) {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  api('client-error', { body: { where, message } }).catch(() => {});
}

// Public sign-in settings, fetched once (and again after a failure).
let config: Promise<{ android: AppCheck | null }> | null = null;
function getConfig() {
  config ??= api<{ android: AppCheck | null }>('auth/config').catch((e) => {
    config = null;
    throw e;
  });
  return config;
}

export const backend = {
  /** Fetches sign-in settings and warms up Play Integrity before it's needed. */
  async prepareSignIn() {
    const { android } = await getConfig();
    if (android) await prepareAppCheck(android);
  },
  async sendCode(email: string) {
    const { android } = await getConfig();
    let integrity: string | undefined;
    try {
      integrity = await appCheckToken(android, email);
    } catch (e) {
      reportError('integrity', e);
      throw new ApiError("Couldn't check this device. Make sure Google Play is up to date and try again.", 0);
    }
    await api('auth/code', { body: { email, platform: 'android', integrity } });
  },
  async verifyCode(email: string, code: string) {
    const res = await api<{ reader: User; onboarded: boolean; token?: string }>('auth/verify', {
      body: { email, code, platform: 'android' },
    });
    if (!res.token) throw new ApiError('Something went wrong. Try again.', 500);
    await saveToken(res.token);
    emit({ user: res.reader, onboarded: res.onboarded });
    return res.reader;
  },
  async signOut() {
    flushViews();
    await api('auth/signout', { body: {} }).catch(() => {});
    await saveToken(null);
    emit(null);
  },
  async deleteAccount() {
    await api('me', { method: 'DELETE', body: {} });
    await saveToken(null);
    emit(null);
  },
  async hasToken() {
    return !!(await readToken());
  },
  async getSession(): Promise<Session> {
    const { reader, onboarded } = await api<{ reader: User | null; onboarded: boolean }>('me');
    // The server no longer knows this token: forget it.
    if (!reader) await saveToken(null);
    return { user: reader, onboarded };
  },
  onAuthChange(cb: (s: Session | null) => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  async getFeed(limit: number, exclude: number[]) {
    const q = new URLSearchParams({ limit: String(limit), exclude: exclude.join(',') });
    return (await api<{ quotes: Quote[] }>(`feed?${q}`)).quotes;
  },
  async react(quoteId: number, kind: Kind, on: boolean) {
    await api('reactions', { body: { quoteId, kind, on } });
  },
  flushViews,
  recordView(quoteId: number, dwellMs: number) {
    views.push({ quoteId, dwellMs: Math.round(dwellMs) });
    if (views.length >= VIEW_BATCH) flushViews();
    else viewTimer ??= setTimeout(flushViews, VIEW_FLUSH_MS);
  },
  async getLibrary(kind: Kind) {
    return (await api<{ quotes: Quote[] }>(`library?kind=${kind}`)).quotes;
  },
  async getTaste() {
    return (await api<{ taste: Taste[] }>('taste')).taste;
  },
  async setTastes(themes: string[]) {
    await api('taste', { method: 'PUT', body: { themes } });
  },
  /** Where the share image is drawn, and the header that unlocks it (Phase 4). */
  async shareImageRequest(quoteId: number, tone: string) {
    return {
      uri: `${BASE}/api/share/${quoteId}?tone=${encodeURIComponent(tone)}`,
      headers: { Authorization: `Bearer ${await readToken()}` } as Record<string, string>,
    };
  },
};
