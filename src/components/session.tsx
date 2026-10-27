"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backend, type User } from "@/lib/backend";

type Status = "loading" | "out" | "in";
type Session = {
  status: Status;
  user: User | null;
  onboarded: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const current = useRef<string | null | undefined>(undefined);

  const resolve = useCallback(async (u: User | null, force = false) => {
    if (!force && current.current === (u?.id ?? null)) return;
    current.current = u?.id ?? null;
    setUser(u);
    if (!u) {
      setStatus("out");
      return;
    }
    setStatus("loading");
    try {
      const taste = await backend.getTaste();
      setOnboarded(taste.length > 0);
    } catch {
      setOnboarded(false);
    }
    setStatus("in");
  }, []);

  useEffect(() => {
    backend
      .getUser()
      .then((u) => resolve(u))
      .catch(() => resolve(null));
    return backend.onAuthChange((u) => resolve(u));
  }, [resolve]);

  const refresh = useCallback(() => resolve(user, true), [resolve, user]);

  return (
    <SessionContext.Provider value={{ status, user, onboarded, refresh }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
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
