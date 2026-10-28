"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, backend, OTP_LENGTH } from "@/lib/backend";
import { useGuard } from "@/components/session";
import { Back } from "@/components/icons";
import s from "./login.module.css";

const RESEND_AFTER = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  useGuard("guest");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL.test(clean)) return setError("That email doesn't look quite right.");
    setBusy(true);
    setError("");
    try {
      await backend.sendCode(clean);
      setEmail(clean);
      setCode("");
      setStep("code");
      setWait(RESEND_AFTER);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError((err as Error).message);
      if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError("");
    try {
      await backend.verifyCode(email, value);
      // The session guard takes it from here.
    } catch (err) {
      setError((err as Error).message);
      setCode("");
      codeRef.current?.focus();
      setBusy(false);
    }
  }

  function onCode(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setCode(digits);
    if (digits.length === OTP_LENGTH && !busy) verify(digits);
  }

  return (
    <main className={`page bare ${s.page}`}>
      <header className="topbar">
        {step === "email" ? (
          <Link href="/" className={s.back} aria-label="Back">
            <Back />
          </Link>
        ) : (
          <button className={s.back} onClick={() => setStep("email")} aria-label="Change email">
            <Back />
          </button>
        )}
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span style={{ width: 44 }} />
      </header>

      {step === "email" ? (
        <form key="email" className={s.body} onSubmit={send}>
          <p className="eyebrow rise">Step one of two</p>
          <h1 className={`${s.title} rise d1`}>
            Your <em>email,</em> please.
          </h1>
          <p className={`${s.sub} rise d2`}>
            No password to remember. We&apos;ll send a {OTP_LENGTH}-digit code, whether you&apos;re new or returning.
          </p>
          <input
            className="field rise d3"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@somewhere.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <p className="error">{error}</p>
          <div className={s.foot}>
            <button className="btn block" disabled={busy || !email}>
              {busy ? <span className="spinner" style={{ borderTopColor: "var(--paper)" }} /> : "Continue with email"}
            </button>
            <p className={s.promise}>
              We don&apos;t have bandwidth to send you promotional emails<span>…</span>
            </p>
            <Link href="/privacy" className="fine">
              How we handle your data
            </Link>
          </div>
        </form>
      ) : (
        <div key="code" className={s.body}>
          <p className="eyebrow rise">Step two of two</p>
          <h1 className={`${s.title} rise d1`}>
            Check your <em>inbox.</em>
          </h1>
          <p className={`${s.sub} rise d2`}>
            We sent a code to <strong>{email}</strong>. It expires soon.
          </p>

          <label className={`${s.otp} rise d3`} style={{ "--n": OTP_LENGTH } as React.CSSProperties}>
            <input
              ref={codeRef}
              className={s.otpInput}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d*"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(e) => onCode(e.target.value)}
              aria-label={`${OTP_LENGTH}-digit code`}
              disabled={busy}
            />
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <span
                key={i}
                className={s.cell}
                data-filled={i < code.length || undefined}
                data-active={(i === code.length && !busy) || undefined}
              >
                {code[i] ?? ""}
              </span>
            ))}
          </label>

          <p className="error">{error}</p>

          <div className={s.foot}>
            {busy ? (
              <div className={s.verifying}>
                <span className="spinner" /> Opening your feed…
              </div>
            ) : (
              <button className={s.resend} disabled={wait > 0} onClick={() => send()}>
                {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
