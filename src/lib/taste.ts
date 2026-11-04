import type { Taste } from "./types";

// Turns stored taste weights into what a reader can trust: each theme's real
// share of everything pulling on their feed. Weights at or below zero pull
// nothing, so they get no share. Shared by the website and the app.

/** How a theme got here, which also decides how much of the feed it can fill. */
export type TasteKind = "picked" | "learned" | "exploring";
export type TasteShare = { feature: string; percent: number; fraction: number; kind: TasteKind };

export const TASTE_KIND_LABEL: Record<TasteKind, string> = {
  picked: "Picked",
  learned: "Learned",
  exploring: "Exploring",
};

// One hue, deepest for the strongest pull.
const RAMP = ["#7a1230", "#c21f48", "#e8365f", "#ee6a88", "#f396ab", "#f6c3cf"];
export const tasteColor = (rank: number) => RAMP[Math.min(rank, RAMP.length - 1)];

export function tasteShares(taste: Taste[]) {
  const pulling = taste.filter((t) => t.weight > 0).sort((a, b) => b.weight - a.weight);
  const total = pulling.reduce((sum, t) => sum + t.weight, 0);
  const exact = pulling.map((t) => (t.weight / total) * 100);
  const percents = exact.map(Math.floor);

  // Largest remainders round up, so the list always adds up to exactly 100.
  const left = pulling.length ? 100 - percents.reduce((sum, p) => sum + p, 0) : 0;
  exact
    .map((value, i) => ({ i, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest)
    .slice(0, left)
    .forEach(({ i }) => percents[i]++);

  const shares: TasteShare[] = pulling.map((t, i) => ({
    feature: t.feature,
    percent: percents[i],
    fraction: t.weight / total,
    kind: t.picked ? "picked" : t.fav ? "learned" : "exploring",
  }));
  // Still in the reader's themes, but skipped so often they pull nothing yet.
  const quiet = taste.filter((t) => t.fav && t.weight <= 0).map((t) => t.feature);
  return { shares, quiet };
}

/** The headline's first words; the top theme's name follows, except when evenly spread. */
export function tasteLead(shares: TasteShare[]) {
  if (!shares.length) return null;
  if (shares.length > 1 && shares[0].percent - shares[shares.length - 1].percent <= 2) return "Evenly spread";
  return shares[0].percent >= 50 ? "Mostly" : "Led by";
}

export const percentLabel = (percent: number) => (percent === 0 ? "<1%" : `${percent}%`);
