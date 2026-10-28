"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { backend, type Kind, type Quote } from "@/lib/backend";
import { useGuard } from "@/components/session";
import { Nav } from "@/components/nav";
import { QuoteCard, TONES, type Tone } from "@/components/quote-card";
import { shareQuote, useToast } from "@/components/toast";
import s from "./feed.module.css";

type Item = { key: string; q: Quote };

const BATCH = 8;
const PREFETCH = 3; // load more when this close to the end
const RECENT = 40; // never repeat a quote within this many cards

export default function Feed() {
  const ready = useGuard("reader");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [empty, setEmpty] = useState(false);
  const [toast, toastNode] = useToast();
  const itemsRef = useRef<Item[]>([]);
  const loading = useRef(false);
  const seq = useRef(0);

  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const recent = itemsRef.current.slice(-RECENT).map((i) => i.q.id);
      const next = await backend.getFeed(BATCH, recent);
      if (!next.length && !itemsRef.current.length) setEmpty(true);
      setItems((prev) => [...prev, ...next.map((q) => ({ key: `${q.id}.${seq.current++}`, q }))]);
    } catch {
      toast("Couldn't reach the library. Scroll to retry.");
    } finally {
      loading.current = false;
    }
  }, [toast]);

  useEffect(() => {
    if (ready && !itemsRef.current.length) load();
  }, [ready, load]);

  const setFlag = (id: number, kind: Kind, on: boolean) =>
    setItems((prev) =>
      prev.map((i) => (i.q.id === id ? { ...i, q: { ...i.q, [kind === "like" ? "liked" : "saved"]: on } } : i)),
    );

  const onReact = useCallback(
    async (q: Quote, kind: Kind, on: boolean) => {
      setFlag(q.id, kind, on);
      if (kind === "save") toast(on ? "Kept on your shelf" : "Removed from your shelf");
      try {
        await backend.react(q.id, kind, on);
      } catch {
        setFlag(q.id, kind, !on);
        toast("That didn't save. Try again.");
      }
    },
    [toast],
  );

  if (!ready) return <div className="center"><span className="spinner" /></div>;

  const tone: Tone = TONES[active % TONES.length];

  return (
    <main className={s.feed}>
      <header className={s.head} data-tone={tone}>
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span className={s.for}>For you</span>
      </header>

      {items.map(({ key, q }, i) => (
        <QuoteCard
          key={key}
          quote={q}
          tone={TONES[i % TONES.length]}
          onReact={onReact}
          onShare={(x) => shareQuote(x.text, toast)}
          onEnter={() => {
            setActive(i);
            if (i >= itemsRef.current.length - PREFETCH) load();
          }}
          onLeave={(ms) => backend.recordView(q.id, ms)}
        />
      ))}

      {empty ? (
        <section className={s.end}>
          <p className="eyebrow">The shelves are empty</p>
          <p className={s.endText}>No quotes in the library yet. Run npm run db:apply to fill it.</p>
        </section>
      ) : (
        items.length > 0 && (
          // Not a snap target: if it were, the browser would stay snapped to it as quotes land above.
          <div className={s.more} data-tone={TONES[items.length % TONES.length]}>
            <span className="spinner" />
          </div>
        )
      )}

      {items.length === 0 && !empty && <p className={s.hint}>Finding lines for you…</p>}
      {items.length > 0 && active === 0 && <p className={s.swipe}>Swipe up · double-tap to like</p>}

      <Nav tone={tone} />
      {toastNode}
    </main>
  );
}
