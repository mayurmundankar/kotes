import type { Metadata } from "next";
import Link from "next/link";
import { Back } from "@/components/icons";
import s from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy — kotes",
  description: "What kotes collects, why, and how to delete it.",
};

// Where readers can write about their data. Left empty, the page points them
// to in-app deletion only.
const CONTACT_EMAIL = "privacy.kotes@mayurmundankar.com";
const UPDATED = "28 October 2026";

export default function Privacy() {
  return (
    <main className={`page bare ${s.page}`}>
      <header className="topbar">
        <Link href="/" className={s.back} aria-label="Back to kotes">
          <Back />
        </Link>
        <span className="wordmark">
          kotes<i>.</i>
        </span>
        <span style={{ width: 44 }} />
      </header>

      <p className="eyebrow">Updated {UPDATED}</p>
      <h1 className={s.title}>
        Your privacy, <em>plainly.</em>
      </h1>

      <section className={s.short}>
        <p>kotes is a quiet place to read. We keep only what it takes to sign you in and to choose what you read next.</p>
        <ul>
          <li>No passwords, no ads, no trackers, no analytics.</li>
          <li>We never sell or share your data for marketing.</li>
          <li>We don&apos;t have bandwidth to send you promotional emails. Only sign-in codes.</li>
          <li>Delete your account any time, and everything goes with it.</li>
        </ul>
      </section>

      <section className={s.block}>
        <h2>What we keep</h2>
        <dl>
          <dt>Your email address</dt>
          <dd>To send you a sign-in code and to know it&apos;s you.</dd>
          <dt>What you read</dt>
          <dd>
            The quotes shown to you, how long you stayed on each, and what you like and keep. From these we work out
            your taste (for example, &ldquo;leans towards melancholy&rdquo;) so the feed can choose for you. You can
            see it on the <em>You</em> page.
          </dd>
          <dt>The themes you pick</dt>
          <dd>When you join or retune, as a starting point for your feed.</dd>
          <dt>Sign-in records</dt>
          <dd>
            For each signed-in device, a scrambled version of its session key, when it was last used, and the
            browser&apos;s name (so a session can be recognised). Sign-in codes are stored only in scrambled form.
          </dd>
          <dt>Your IP address</dt>
          <dd>
            Used briefly, in memory, to stop abuse such as floods of sign-in requests. We don&apos;t store it with your
            account.
          </dd>
        </dl>
      </section>

      <section className={s.block}>
        <h2>Who helps us</h2>
        <dl>
          <dt>Supabase</dt>
          <dd>Hosts our database, in Tokyo, Japan. Everything above lives there.</dd>
          <dt>Resend</dt>
          <dd>Delivers your sign-in emails. It sees your email address and the message.</dd>
          <dt>Cloudflare</dt>
          <dd>Carries traffic to kotes securely. Like any network, it sees IP addresses and requests.</dd>
        </dl>
        <p>Each processes data only to provide its service to us.</p>
      </section>

      <section className={s.block}>
        <h2>Cookies and storage</h2>
        <p>
          One cookie, <code>kotes_session</code>, keeps you signed in. It&apos;s essential, can&apos;t be read by
          scripts, and isn&apos;t used for anything else. Your browser also remembers that you&apos;re signed in so
          pages open faster. No advertising or tracking cookies, ever.
        </p>
      </section>

      <section className={s.block}>
        <h2>How long</h2>
        <dl>
          <dt>Sign-in codes</dt>
          <dd>Expire after 10 minutes and are deleted within a day.</dd>
          <dt>Sessions</dt>
          <dd>End 90 days after a device was last used, or when you sign out.</dd>
          <dt>Your account and reading history</dt>
          <dd>Kept until you delete your account.</dd>
        </dl>
      </section>

      <section className={s.block}>
        <h2>Your choices</h2>
        <p>
          Open <em>You</em> and tap <em>Delete my account</em>. It permanently erases your email, sessions, taste,
          likes, kept quotes and reading history, right away. Signing out ends the session on that device.
        </p>
        {CONTACT_EMAIL ? (
          <p>
            For anything else about your data, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        ) : null}
      </section>

      <section className={s.block}>
        <h2>Children</h2>
        <p>kotes isn&apos;t meant for children under 13, and we don&apos;t knowingly keep their data.</p>
      </section>

      <section className={s.block}>
        <h2>Changes</h2>
        <p>If this policy changes, we&apos;ll update it here and change the date at the top.</p>
      </section>

      <footer className={s.foot}>
        <Link href="/" className="link">
          Back to kotes
        </Link>
      </footer>
    </main>
  );
}
