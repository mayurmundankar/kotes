// Colourways for shared story images. Shared by the server renderer and the
// share sheet's swatches.
export const SHARE_TONES = ["rose", "wine", "paper", "blush"] as const;
export type ShareTone = (typeof SHARE_TONES)[number];

export const PALETTE: Record<ShareTone, { bg: string; ink: string; accent: string; soft: string }> = {
  paper: { bg: "#fff6f7", ink: "#2a0711", accent: "#e8365f", soft: "rgba(42,7,17,0.55)" },
  blush: { bg: "#fdecf0", ink: "#2a0711", accent: "#e8365f", soft: "rgba(42,7,17,0.55)" },
  rose: { bg: "#e8365f", ink: "#fff6f7", accent: "#2a0711", soft: "rgba(255,246,247,0.8)" },
  wine: { bg: "#2a0711", ink: "#fff6f7", accent: "#e8365f", soft: "rgba(246,195,207,0.72)" },
};

export const isShareTone = (v: unknown): v is ShareTone => SHARE_TONES.includes(v as ShareTone);
