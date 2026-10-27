"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { backend } from "@/lib/backend";
import { THEMES } from "@/lib/themes";
import { useGuard, useSession } from "@/components/session";
import s from "./onboarding.module.css";

const MIN = 3;

export default function Onboarding() {
  const ready = useGuard("member");
  const { onboarded, refresh } = useSession();
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Retuning: start from the themes the reader already leans towards.
  useEffect(() => {
    if (!ready || !onboarded) return;
    backend.getTaste().then((t) =>
      setPicked(t.filter((x) => !x.feature.startsWith("by:") && x.weight > 0).map((x) => x.feature)),
    );
  }, [ready, onboarded]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function done() {
    setBusy(true);
    await backend.setTastes(picked);
    await refresh();
    router.replace("/feed");
  }

  if (!ready) return <div className="center"><span className="spinner" /></div>;

  const left = MIN - picked.length;
  return (
    <main className={`page bare ${s.page}`}>
      <header className="topbar">
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span className="eyebrow">{onboarded ? "Retune" : "Welcome"}</span>
      </header>

      <h1 className={`${s.title} rise d1`}>
        What <em>moves</em> you?
      </h1>
      <p className={`${s.sub} rise d2`}>
        Pick at least three. It&apos;s only a first guess — kotes keeps learning from every line you keep.
      </p>

      <div className={`${s.chips} rise d3`}>
        {THEMES.map((t) => (
          <button key={t.id} className="chip" aria-pressed={picked.includes(t.id)} onClick={() => toggle(t.id)}>
            {t.label}
            <span className={s.line}>{t.line}</span>
          </button>
        ))}
      </div>

      <div className={s.dock}>
        <button className="btn block" disabled={left > 0 || busy} onClick={done}>
          {busy ? (
            <span className="spinner" style={{ borderTopColor: "var(--paper)" }} />
          ) : left > 0 ? (
            `Pick ${left} more`
          ) : (
            "Start reading"
          )}
        </button>
      </div>
    </main>
  );
}
