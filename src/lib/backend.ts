// The browser's view of the kotes API (src/app/api). Auth is a session cookie
// set by the server; the browser never holds a token or talks to the database.

import type { Kind, Quote, Session, Taste, User } from "./types";

export * from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

const listeners = new Set<(s: Session | null) => void>();
const emit = (s: Session | null) => listeners.forEach((cb) => cb(s));

async function api<T>(path: string, init?: { method?: string; body?: unknown; keepalive?: boolean }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      keepalive: init?.keepalive,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Couldn't reach kotes. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The session ended elsewhere (signed out, expired): send them back to sign in.
    if (res.status === 401) emit(null);
    // No JSON error means kotes itself didn't answer: Cloudflare's own error
    // page while the server restarts or is unreachable.
    const fallback =
      res.status >= 500 ? "kotes is taking a breath. Try again in a moment." : "Something went wrong. Try again.";
    throw new ApiError(data.error ?? fallback, res.status, data.retryAfter);
  }
  return data as T;
}

// Views are sent in batches: every few seconds, or when the page is hidden.
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
  // keepalive lets the request finish even if the page is closing.
  api("views", { body: { views: batch }, keepalive: true }).catch(() => {});
}

if (typeof window !== "undefined") {
  addEventListener("pagehide", flushViews);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushViews());
}

/** Sends an unexpected browser error to the server log. Never throws. */
export function reportError(where: string, err: unknown) {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  api("client-error", { body: { where, message } }).catch(() => {});
}

export const backend = {
  async sendCode(email: string, proof: { turnstile: string; website: string; automated: boolean }) {
    await api("auth/code", { body: { email, ...proof } });
  },
  async verifyCode(email: string, code: string) {
    const { reader, onboarded } = await api<{ reader: User; onboarded: boolean }>("auth/verify", { body: { email, code } });
    emit({ user: reader, onboarded });
    return reader;
  },
  async signOut() {
    await api("auth/signout", { body: {} }).catch(() => {});
    emit(null);
  },
  async deleteAccount() {
    await api("me", { method: "DELETE", body: {} });
    emit(null);
  },
  async getSession(): Promise<Session> {
    const { reader, onboarded } = await api<{ reader: User | null; onboarded: boolean }>("me");
    return { user: reader, onboarded };
  },
  onAuthChange(cb: (s: Session | null) => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  async getFeed(limit: number, exclude: number[]) {
    const q = new URLSearchParams({ limit: String(limit), exclude: exclude.join(",") });
    return (await api<{ quotes: Quote[] }>(`feed?${q}`)).quotes;
  },
  async react(quoteId: number, kind: Kind, on: boolean) {
    await api("reactions", { body: { quoteId, kind, on } });
  },
  recordView(quoteId: number, dwellMs: number) {
    views.push({ quoteId, dwellMs: Math.round(dwellMs) });
    if (views.length >= VIEW_BATCH) flushViews();
    else viewTimer ??= setTimeout(flushViews, VIEW_FLUSH_MS);
  },
  async getLibrary(kind: Kind) {
    return (await api<{ quotes: Quote[] }>(`library?kind=${kind}`)).quotes;
  },
  async getTaste() {
    return (await api<{ taste: Taste[] }>("taste")).taste;
  },
  async setTastes(themes: string[]) {
    await api("taste", { method: "PUT", body: { themes } });
  },
};
