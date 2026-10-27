"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { backend, type Taste } from "@/lib/backend";
import { themeLabel } from "@/lib/themes";
import { useGuard, useSession } from "@/components/session";
import { Nav } from "@/components/nav";
import { Arrow } from "@/components/icons";
import s from "./you.module.css";

export default function You() {
  const ready = useGuard("reader");
  const { user } = useSession();
  const router = useRouter();
  const [taste, setTaste] = useState<Taste[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (ready) backend.getTaste().then(setTaste);
  }, [ready]);

  if (!ready) return <div className="center"><span className="spinner" /></div>;

  const themes = (taste ?? []).filter((t) => !t.feature.startsWith("by:") && t.weight > 0).slice(0, 6);
  const max = Math.max(1, ...themes.map((t) => t.weight));

  async function signOut() {
    await backend.signOut();
    router.replace("/");
  }

  // Two taps: the first arms the button for a few seconds.
  async function deleteAccount() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setDeleting(true);
    try {
      await backend.deleteAccount();
      router.replace("/");
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span className="eyebrow">Reader</span>
      </header>

      <section className={`${s.hello} rise`}>
        <p className="eyebrow">Signed in as</p>
        <h1 className={s.email}>{user?.email}</h1>
      </section>

      <section className={`${s.block} rise d1`}>
        <div className={s.blockHead}>
          <h2>Your taste</h2>
          <Link href="/onboarding" className="link">
            Retune <Arrow />
          </Link>
        </div>
        <p className={s.note}>Learned from what you like, keep and linger on.</p>
        <ul className={s.bars}>
          {themes.map((t) => (
            <li key={t.feature}>
              <span className={s.label}>{themeLabel(t.feature)}</span>
              <span className={s.track}>
                <span className={s.fill} style={{ width: `${(t.weight / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${s.block} rise d3`}>
        <button className={s.out} onClick={signOut}>
          Sign out
        </button>
        <button className={s.delete} onClick={deleteAccount} disabled={deleting} data-armed={confirming || undefined}>
          {deleting ? "Deleting…" : confirming ? "Tap again to delete everything" : "Delete my account"}
        </button>
        <p className="fine">kotes is for readers only. No posting, no followers, no noise.</p>
      </section>

      <Nav />
    </main>
  );
}
