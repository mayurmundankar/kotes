import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const TURNSTILE = "https://challenges.cloudflare.com";
// Google Analytics (GA4): the tag loads from Tag Manager and reports to
// Analytics. Google's documented hosts for GA4 under a CSP.
const GA_SCRIPT = "https://*.googletagmanager.com";
const GA_CONNECT = "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";
const GA_IMG = "https://*.google-analytics.com https://*.googletagmanager.com";

// Next's inline bootstrap scripts need 'unsafe-inline' (pages are prerendered,
// so per-request nonces aren't possible). The rest is locked to this origin,
// plus Cloudflare's human check and Google Analytics. React escapes all output
// and nothing renders raw HTML, so there is no injection point for inline
// script to exploit.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE} ${GA_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GA_IMG}`,
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE} ${GA_CONNECT}`,
  `frame-src ${TURNSTILE}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

// Pages that are only meaningful when signed in: keep them out of search
// engines and AI indexes (robots.txt says the same; this covers bots that ignore it).
const PRIVATE = ["/login", "/onboarding", "/feed", "/library", "/you", "/api/:path*"];
const NO_INDEX = "noindex, nofollow, noarchive, nosnippet, noimageindex";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  // The share-image route reads these TrueType fonts from disk at runtime.
  outputFileTracingIncludes: { "/api/share/*": ["./src/fonts/og/**"] },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      // No other site can hold a handle to a kotes window, or load its responses.
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      { key: "Origin-Agent-Cluster", value: "?1" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), " +
          "accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), browsing-topics=(), interest-cohort=()",
      },
      // Opt out of AI training where the convention is honoured.
      { key: "X-Robots-Tag", value: "noai, noimageai" },
      // Dev needs eval and plain-http HMR, so these two are production-only.
      ...(isProd
        ? [
            { key: "Content-Security-Policy", value: csp },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          ]
        : []),
    ];
    return [
      { source: "/:path*", headers: security },
      ...PRIVATE.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: `${NO_INDEX}, noai, noimageai` }] })),
      // Per-reader data must never be cached by a proxy or the browser.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
