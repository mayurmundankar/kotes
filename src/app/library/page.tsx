"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { backend, type Kind, type Quote } from "@/lib/backend";
import { themeLabel } from "@/lib/themes";
import { useGuard } from "@/components/session";
import { Nav } from "@/components/nav";
import { Bookmark, Heart, Share } from "@/components/icons";
import { shareQuote, useToast } from "@/components/toast";
import s from "./library.module.css";

export default function Library() {
  const ready = useGuard("reader");
  const [tab, setTab] = useState<Kind>("save");
  const [lists, setLists] = useState<Record<Kind, Quote[] | null>>({ save: null, like: null });
  const [toast, toastNode] = useToast();

  useEffect(() => {
    if (!ready) return;
    Promise.all([backend.getLibrary("save"), backend.getLibrary("like")]).then(([save, like]) =>
      setLists({ save, like }),
    );
  }, [ready]);

  // Toggling keeps the row in place so a stray tap can be undone.
  async function toggle(q: Quote, kind: Kind) {
    const key = kind === "like" ? "liked" : "saved";
    const on = !q[key];
    const patch = (v: boolean) =>
      setLists((l) => ({
        save: l.save?.map((x) => (x.id === q.id ? { ...x, [key]: v } : x)) ?? null,
        like: l.like?.map((x) => (x.id === q.id ? { ...x, [key]: v } : x)) ?? null,
      }));
    patch(on);
    try {
      await backend.react(q.id, kind, on);
    } catch {
      patch(!on);
      toast("That didn't save. Try again.");
    }
  }

  if (!ready) return <div className="center"><span className="spinner" /></div>;

  const list = lists[tab];
  const count = (k: Kind) => lists[k]?.length ?? "–";

  return (
    <main className="page">
      <header className="topbar">
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span className="eyebrow">Your shelf</span>
      </header>

      <h1 className={`${s.title} rise`}>
        Words that <em>stayed.</em>
      </h1>

      <div className={s.tabs} role="tablist">
        {(["save", "like"] as Kind[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {k === "save" ? "Kept" : "Liked"} <sup>{count(k)}</sup>
          </button>
        ))}
      </div>

      {list === null ? (
        <div className={s.loading}>
          <span className="spinner" />
        </div>
      ) : list.length === 0 ? (
        <div className={s.empty}>
          <p className={s.emptyText}>
            {tab === "save"
              ? "Nothing kept yet. Tap the bookmark on any line that stays with you."
              : "No likes yet. Double-tap a quote you love."}
          </p>
          <Link href="/feed" className="btn">
            Go reading
          </Link>
        </div>
      ) : (
        <ol className={s.list}>
          {list.map((q, i) => (
            <li key={q.id} className={`${s.item} rise`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <blockquote>{q.text}</blockquote>
              <div className={s.row}>
                <p className={s.tags}>{q.tags.map(themeLabel).join(" · ")}</p>
                <div className={s.acts}>
                  <button data-on={q.liked || undefined} onClick={() => toggle(q, "like")} aria-label="Like">
                    <Heart size={21} filled={q.liked} />
                  </button>
                  <button data-on={q.saved || undefined} onClick={() => toggle(q, "save")} aria-label="Keep">
                    <Bookmark size={21} filled={q.saved} />
                  </button>
                  <button onClick={() => shareQuote(q.text, toast)} aria-label="Share">
                    <Share size={21} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Nav />
      {toastNode}
    </main>
  );
}
