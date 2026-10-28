import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted static fonts, built by scripts/build-fonts.py. Static files because
// variable fonts rendered at their thinnest weight in WebKit (iPhone); these faces
// because Bodoni's and Cormorant's hairlines vanished on phone screens.

// Display: brand, headlines. One weight by design: it is already a heavy Didone.
const dmSerif = localFont({
  variable: "--font-display",
  src: [
    { path: "../fonts/dmserif/dmserif-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/dmserif/dmserif-400-italic.woff2", weight: "400", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
});

// Reading: every quote.
const garamond = localFont({
  variable: "--font-read",
  src: [
    { path: "../fonts/garamond/garamond-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/garamond/garamond-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/garamond/garamond-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/garamond/garamond-500-italic.woff2", weight: "500", style: "italic" },
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
    <html lang="en" className={`${dmSerif.variable} ${garamond.variable} ${manrope.variable}`}>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
