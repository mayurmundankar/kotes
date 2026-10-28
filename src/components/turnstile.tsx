"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, the "are you human?" check before a sign-in code is
// sent. Invisible for most people ("interaction-only"); it shows a checkbox
// only when Cloudflare isn't sure. Does nothing until the server has a key.

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoad: Promise<void> | null = null;

function loadScript() {
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptLoad = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(el);
  });
  return scriptLoad;
}

export function useTurnstile() {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((t: string | null) => void)[]>([]);
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((c) => setSiteKey(c.turnstileSiteKey ?? null))
      .catch(() => setSiteKey(null));
  }, []);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let cancelled = false;
    const settle = (t: string | null) => {
      token.current = t;
      if (t !== null) waiters.current.splice(0).forEach((w) => w(t));
    };
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          action: "signin",
          appearance: "interaction-only",
          theme: "light",
          callback: (t: string) => settle(t),
          "expired-callback": () => settle(null),
          "error-callback": () => settle(null),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  /** A fresh token (single use), waiting briefly for the check if needed. */
  const getToken = useCallback(async (): Promise<string> => {
    if (siteKey === null) return "";
    if (token.current) return token.current;
    const t = await new Promise<string | null>((resolve) => {
      waiters.current.push(resolve);
      setTimeout(() => resolve(null), 20_000);
    });
    if (!t) throw new Error("Please confirm you're human, then try again.");
    return t;
  }, [siteKey]);

  /** Tokens are single use: get a new one for the next request. */
  const reset = useCallback(() => {
    token.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return { box, getToken, reset, ready: siteKey !== undefined };
}
