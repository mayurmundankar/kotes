import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Next's inline bootstrap scripts need 'unsafe-inline'; everything else is same-origin only.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      // Dev needs eval and plain-http HMR, so these two are production-only.
      ...(isProd
        ? [
            { key: "Content-Security-Policy", value: csp },
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          ]
        : []),
    ];
    return [
      { source: "/:path*", headers: security },
      // Per-reader data must never be cached by a proxy or the browser.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
