// The shapes the kotes API (src/app/api) sends and takes. Shared by the web
// client (backend.ts), the server and the Android app (mobile/).

export type Quote = {
  id: number;
  text: string;
  author: string;
  source: string | null;
  tags: string[];
  liked: boolean;
  saved: boolean;
};

export type User = { id: string; email: string };
export type Session = { user: User | null; onboarded: boolean };
// `fav`: one of the reader's themes (picked, or liked/kept twice); the feed leans on these.
export type Taste = { feature: string; weight: number; picked: boolean; fav: boolean };
export type Kind = "like" | "save";

export const OTP_LENGTH = 6;
