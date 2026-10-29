import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

// Google Analytics (GA4) for the website only; the Android app doesn't load it.
// Production only, so local development doesn't count as visits.
const GA_ID = "G-QCK21V7P0J";
const analytics = process.env.NODE_ENV === "production";

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

const title = "kotes · the feed that reads you back";
const description = "Endless quotes from the minds worth keeping, tuned to what moves you. For readers only.";
// Link previews (WhatsApp, Instagram, Facebook, X) need absolute URLs.
const site = process.env.SITE_URL ?? "https://kotes.mayurmundankar.com";
const preview = { url: "/og.png", width: 1200, height: 630, alt: "kotes. The feed that reads you back." };

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title,
  description,
  appleWebApp: { capable: true, title: "kotes", statusBarStyle: "default" },
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
  openGraph: { type: "website", siteName: "kotes", url: "/", title, description, images: [preview] },
  twitter: { card: "summary_large_image", title, description, images: [preview] },
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
        {analytics && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
