"use client";

import Link from "next/link";
import { useGuard } from "@/components/session";
import { Arrow } from "@/components/icons";
import s from "./landing.module.css";

const FAN = [
  { text: "I dwell in Possibility.", theme: "Hope", tone: s.wine },
  { text: "Forever is composed of nows.", theme: "Time", tone: s.blush },
  { text: "We are all in the gutter, but some of us are looking at the stars.", theme: "Wit", tone: s.rose },
];

const STEPS = [
  { n: "01", title: "Read.", body: "An endless river of lines — poets, stoics, wits and the quietly heartbroken." },
  { n: "02", title: "Linger.", body: "What you like, keep and linger on teaches kotes your taste. Nothing else does." },
  { n: "03", title: "Keep.", body: "Save the ones that stay with you. A private shelf of words, always within reach." },
];

export default function Landing() {
  useGuard("guest");

  return (
    <main className={s.page}>
      <header className="topbar rise">
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <Link href="/login" className={s.signin}>
          Sign in
        </Link>
      </header>

      <section className={s.hero}>
        <p className="eyebrow rise d1">A reading app · for humans</p>
        <h1 className="display rise d2">
          The feed that <em>reads you</em> back.
        </h1>
        <p className="lede rise d3">
          Endless quotes from the minds worth keeping — quietly tuned, line by line, to what moves you.
        </p>
        <div className={`${s.ctas} rise d4`}>
          <Link href="/login" className="btn">
            Begin reading
          </Link>
          <a href="#how" className="link">
            How it works <Arrow />
          </a>
        </div>
        <p className="fine rise d4">Free. Passwordless. No posts, no noise — only reading.</p>
      </section>

      <section className={s.fan} aria-hidden>
        {FAN.map((q, i) => (
          <figure key={i} className={`${s.card} ${q.tone}`} style={{ "--i": i } as React.CSSProperties}>
            <span className={s.mark}>“</span>
            <blockquote>{q.text}</blockquote>
            <figcaption>{q.theme}</figcaption>
          </figure>
        ))}
      </section>

      <section id="how" className={s.steps}>
        {STEPS.map((st) => (
          <div key={st.n} className={s.step}>
            <span className={s.num}>{st.n}</span>
            <div>
              <h3>{st.title}</h3>
              <p>{st.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className={s.close}>
        <h2>
          Some words <em>find you.</em>
        </h2>
        <Link href="/login" className="btn block">
          Continue with email
        </Link>
        <p className="fine">No password, ever. We send a one-time code.</p>
      </section>

      <footer className={s.foot}>
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span className="fine">Made for readers. © 2026</span>
      </footer>
    </main>
  );
}
