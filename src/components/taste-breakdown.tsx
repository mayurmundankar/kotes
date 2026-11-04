import { TASTE_KIND_LABEL, percentLabel, tasteColor, tasteLead, tasteShares } from "@/lib/taste";
import { themeLabel } from "@/lib/themes";
import type { Taste } from "@/lib/types";
import s from "./taste-breakdown.module.css";

// A reader's taste as true shares: a headline, one bar split by share, then each
// theme with its percentage.
export function TasteBreakdown({ taste }: { taste: Taste[] }) {
  const { shares, quiet } = tasteShares(taste);
  const lead = tasteLead(shares);

  if (!lead) return <p className={s.empty}>Still learning your taste. Like or keep a few quotes and it will show here.</p>;

  return (
    <>
      <p className={s.headline}>
        {lead === "Evenly spread" ? (
          <em>Evenly spread</em>
        ) : (
          <>
            {lead} <em>{themeLabel(shares[0].feature).toLowerCase()}</em>
          </>
        )}
      </p>

      <div className={s.split} aria-hidden>
        {shares.map((t, i) => (
          <span key={t.feature} style={{ flexGrow: t.fraction, background: tasteColor(i) }} />
        ))}
      </div>

      <ul className={s.rows}>
        {shares.map((t, i) => (
          <li key={t.feature}>
            <span className={s.dot} style={{ background: tasteColor(i) }} />
            <span className={s.label}>{themeLabel(t.feature)}</span>
            <span className={s.kind}>{TASTE_KIND_LABEL[t.kind]}</span>
            <span className={s.percent}>{percentLabel(t.percent)}</span>
          </li>
        ))}
      </ul>

      {quiet.length > 0 && <p className={s.foot}>Picked, but quiet for now: {quiet.map(themeLabel).join(", ")}.</p>}
      <p className={s.foot}>Picked and learned themes fill about 85% of your feed. The rest goes to exploring.</p>
    </>
  );
}
