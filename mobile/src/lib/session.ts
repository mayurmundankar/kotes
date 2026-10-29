// Who's reading, as one small store (the web's components/session.tsx). The
// last known session is remembered on the device so a returning reader lands
// on their feed at once; /api/me re-checks it in the background and wins.
import { useSyncExternalStore } from 'react';

import { backend, type Session, type User } from './backend';
import { storage } from './storage';

type Status = 'loading' | 'out' | 'in';
export type Snapshot = { status: Status; user: User | null; onboarded: boolean };

const KEY = 'kotes.session';
const LOADING: Snapshot = { status: 'loading', user: null, onboarded: false };
const OUT: Snapshot = { status: 'out', user: null, onboarded: false };

let snapshot = LOADING;
let started = false;
const subscribers = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  const save =
    next.status === 'in'
      ? storage.set(KEY, JSON.stringify({ user: next.user, onboarded: next.onboarded }))
      : storage.remove(KEY);
  save.catch(() => {});
  subscribers.forEach((cb) => cb());
}

const fromServer = (s: Session | null): Snapshot =>
  s?.user ? { status: 'in', user: s.user, onboarded: s.onboarded } : OUT;

async function revalidate() {
  try {
    if (!(await backend.hasToken())) return publish(OUT);
    publish(fromServer(await backend.getSession()));
  } catch {
    // Offline or a server hiccup: keep a remembered session; otherwise signed out.
    if (snapshot.status === 'loading') publish(OUT);
  }
}

async function start() {
  if (started) return;
  started = true;
  backend.onAuthChange((s) => publish(fromServer(s)));
  try {
    const saved = JSON.parse((await storage.get(KEY)) ?? 'null');
    if (saved?.user && (await backend.hasToken()) && snapshot.status === 'loading') {
      publish({ status: 'in', user: saved.user, onboarded: !!saved.onboarded });
    }
  } catch {}
  revalidate();
}

function subscribe(cb: () => void) {
  start();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

const getSnapshot = () => snapshot;

export function useSession() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...s,
    refresh: revalidate,
    markOnboarded: () => publish({ ...snapshot, onboarded: true }),
  };
}
