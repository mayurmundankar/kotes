// The browser's view of the kotes API (src/app/api). Auth is a session cookie
// set by the server; the browser never holds a token or talks to the database.

export type Quote = {
  id: number;
  text: string;
  author: string;
  source: string | null;
  tags: string[];
  liked: boolean;
  saved: boolean;
};

export type User = { id: string; email: string };
export type Taste = { feature: string; weight: number };
export type Kind = "like" | "save";

export const OTP_LENGTH = 6;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

const listeners = new Set<(u: User | null) => void>();
const emit = (u: User | null) => listeners.forEach((cb) => cb(u));

async function api<T>(path: string, init?: { method?: string; body?: unknown; keepalive?: boolean }): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    keepalive: init?.keepalive,
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The session ended elsewhere (signed out, expired): send them back to sign in.
    if (res.status === 401) emit(null);
    throw new ApiError(data.error ?? "Something went wrong.", res.status, data.retryAfter);
  }
  return data as T;
}

export const backend = {
  async sendCode(email: string) {
    await api("auth/code", { body: { email } });
  },
  async verifyCode(email: string, code: string) {
    const { reader } = await api<{ reader: User }>("auth/verify", { body: { email, code } });
    emit(reader);
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
  async getUser() {
    return (await api<{ reader: User | null }>("me")).reader;
  },
  onAuthChange(cb: (u: User | null) => void) {
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
  async recordView(quoteId: number, dwellMs: number) {
    // keepalive lets the request finish even if the page is closing.
    await api("views", { body: { quoteId, dwellMs: Math.round(dwellMs) }, keepalive: true });
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
