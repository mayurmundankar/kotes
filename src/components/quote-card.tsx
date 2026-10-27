"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { Kind, Quote } from "@/lib/backend";
import { themeLabel } from "@/lib/themes";
import { Bookmark, Heart, Share } from "./icons";
import s from "./quote-card.module.css";

export const TONES = ["paper", "wine", "blush", "rose"] as const;
export type Tone = (typeof TONES)[number];

const sizeFor = (text: string) => {
  const n = text.length;
  if (n < 50) return 46;
  if (n < 90) return 38;
  if (n < 140) return 33;
  if (n < 200) return 29;
  return 26;
};
const MIN_SIZE = 18;

type Props = {
  quote: Quote;
  tone: Tone;
  onReact: (q: Quote, kind: Kind, on: boolean) => void;
  onShare: (q: Quote) => void;
  onEnter: () => void;
  onLeave: (dwellMs: number) => void;
};

export function QuoteCard({ quote, tone, onReact, onShare, onEnter, onLeave }: Props) {
  const ref = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLQuoteElement>(null);
  const lastTap = useRef(0);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const enter = useEffectEvent(onEnter);
  const leaveWith = useEffectEvent(onLeave);

  // Start from a size that suits the quote's length, then shrink until it fits
  // the card: short screens and large system text sizes would otherwise clip it.
  useLayoutEffect(() => {
    const card = ref.current;
    const text = textRef.current;
    if (!card || !text) return;
    const inner = text.parentElement!;
    const fit = () => {
      const cs = getComputedStyle(card);
      const room = card.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let size = sizeFor(quote.text);
      text.style.fontSize = `${size}px`;
      while (inner.offsetHeight > room && size > MIN_SIZE) {
        size -= 1;
        text.style.fontSize = `${size}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(card);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [quote.text]);

  // Dwell: how long this quote held the screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let since = 0;
    const leave = () => {
      if (since) leaveWith(performance.now() - since);
      since = 0;
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          since = performance.now();
          enter();
        } else leave();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      leave();
    };
  }, []);

  function onTap(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      const rect = ref.current!.getBoundingClientRect();
      const id = now;
      setBursts((b) => [...b, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
      if (!quote.liked) onReact(quote, "like", true);
      lastTap.current = 0;
    } else lastTap.current = now;
  }

  return (
    <section ref={ref} className={s.card} data-tone={tone} onClick={onTap}>
      <div className={s.inner}>
        <span className={s.mark} aria-hidden>
          “
        </span>
        <blockquote ref={textRef} className={s.text}>
          {quote.text}
        </blockquote>
        {/* Authors stay hidden: the words have to stand on their own. */}
        <span className={s.dash} aria-hidden />
      </div>

      <p className={s.tags}>
        <span>N° {String(quote.id).padStart(3, "0")}</span>
        {quote.tags.map((t) => (
          <span key={t}>{themeLabel(t)}</span>
        ))}
      </p>

      <div className={s.actions}>
        <button
          className={s.act}
          data-on={quote.liked || undefined}
          onClick={() => onReact(quote, "like", !quote.liked)}
          aria-label={quote.liked ? "Unlike" : "Like"}
          aria-pressed={quote.liked}
        >
          <Heart filled={quote.liked} />
        </button>
        <button
          className={s.act}
          data-on={quote.saved || undefined}
          onClick={() => onReact(quote, "save", !quote.saved)}
          aria-label={quote.saved ? "Remove from kept" : "Keep"}
          aria-pressed={quote.saved}
        >
          <Bookmark filled={quote.saved} />
        </button>
        <button className={s.act} onClick={() => onShare(quote)} aria-label="Share">
          <Share />
        </button>
      </div>

      {bursts.map((b) => (
        <span key={b.id} className={s.burst} style={{ left: b.x, top: b.y }} aria-hidden>
          <Heart size={96} filled />
        </span>
      ))}
    </section>
  );
}
