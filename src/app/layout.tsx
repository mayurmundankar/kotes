import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SessionProvider } from "@/components/session";
import "./globals.css";

// Self-hosted static fonts, built by scripts/build-fonts.py from Google's
// variable fonts. The variable versions rendered at their thinnest weight in
// WebKit (every iPhone browser), and Bodoni's optical-size axis thinned its
// hairlines to nothing at headline sizes. Static files look the same everywhere.

// Display: brand, headlines.
const bodoni = localFont({
  variable: "--font-display",
  src: [
    { path: "../fonts/bodoni/bodoni-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/bodoni/bodoni-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/bodoni/bodoni-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/bodoni/bodoni-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/bodoni/bodoni-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/bodoni/bodoni-500-italic.woff2", weight: "500", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
});

// Reading: every quote.
const cormorant = localFont({
  variable: "--font-read",
  src: [
    { path: "../fonts/cormorant/cormorant-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant/cormorant-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant/cormorant-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant/cormorant-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/cormorant/cormorant-500-italic.woff2", weight: "500", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
});

// Interface: labels, buttons.
const manrope = localFont({
  variable: "--font-ui",
  src: [
    { path: "../fonts/manrope/manrope-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/manrope/manrope-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/manrope/manrope-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/manrope/manrope-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "kotes — the feed that reads you back",
  description: "Endless quotes, tuned to what moves you. For readers only.",
  appleWebApp: { capable: true, title: "kotes", statusBarStyle: "default" },
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff6f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} ${cormorant.variable} ${manrope.variable}`}>
      <body>
        <SessionProvider>
          <div className="app">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
