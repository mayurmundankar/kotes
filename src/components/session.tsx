"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { backend, type Session as ServerSession, type User } from "@/lib/backend";

type Status = "loading" | "out" | "in";
type Snapshot = { status: Status; user: User | null; onboarded: boolean };

// The session is remembered on the device so a returning reader's pages render
// at once; /api/me re-checks it in the background and wins if they differ.
const KEY = "kotes.session";
const LOADING: Snapshot = { status: "loading", user: null, onboarded: false };
const OUT: Snapshot = { status: "out", user: null, onboarded: false };

let snapshot = LOADING;
let started = false;
const subscribers = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  try {
    if (next.status === "in") localStorage.setItem(KEY, JSON.stringify({ user: next.user, onboarded: next.onboarded }));
    else localStorage.removeItem(KEY);
  } catch {}
  subscribers.forEach((cb) => cb());
}

const fromServer = (s: ServerSession | null): Snapshot =>
  s?.user ? { status: "in", user: s.user, onboarded: s.onboarded } : OUT;

async function revalidate() {
  try {
    publish(fromServer(await backend.getSession()));
  } catch {
    // Offline or server hiccup: keep a remembered session; otherwise treat as signed out.
    if (snapshot.status === "loading") publish(OUT);
  }
}

function start() {
  if (started) return;
  started = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved?.user) snapshot = { status: "in", user: saved.user, onboarded: !!saved.onboarded };
  } catch {}
  backend.onAuthChange((s) => publish(fromServer(s)));
  revalidate();
}

function subscribe(cb: () => void) {
  start();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

const getSnapshot = () => {
  start();
  return snapshot;
};
const getServerSnapshot = () => LOADING;

export function useSession() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...s,
    refresh: revalidate,
    markOnboarded: () => publish({ ...snapshot, onboarded: true }),
  };
}

/**
 * Sends people where they belong.
 *  guest  — landing & login: signed-in readers go on to the feed.
 *  member — onboarding: needs an account.
 *  reader — feed, library, profile: needs an account and a taste.
 * Returns true once the current page is the right one to show.
 */
export function useGuard(mode: "guest" | "member" | "reader") {
  const { status, onboarded } = useSession();
  const router = useRouter();

  let dest: string | null = null;
  if (status === "out" && mode !== "guest") dest = "/login";
  if (status === "in" && mode === "guest") dest = onboarded ? "/feed" : "/onboarding";
  if (status === "in" && mode === "reader" && !onboarded) dest = "/onboarding";

  useEffect(() => {
    if (dest) router.replace(dest);
  }, [dest, router]);

  return status !== "loading" && !dest;
}
