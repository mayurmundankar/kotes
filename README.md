# kotes.

The feed that reads you back. An endless, mobile-only quote feed for readers. You can like and keep quotes, and the feed learns your taste from what you do.

- **Stack:** Next.js 16 (App Router) · Postgres on Supabase · Resend
- **Auth:** kotes' own passwordless email codes. Supabase Auth is not used.
- **Fonts:** Bodoni Moda (display), Cormorant Garamond (quotes), Manrope (interface), self-hosted as static files (see [Fonts](#fonts))
- **Palette:** one red-pink hue in four depths: paper, blush, rose, wine

## Run it

```bash
npm install
cp .env.example .env.local   # fill it in
npm run db:apply             # tables, functions, 147 quotes
npm run dev
```

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string. The direct host (`db.<ref>.supabase.co`) is IPv6-only. In Docker or on IPv4 networks, use the **Session pooler** (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`). |
| `AUTH_SECRET` | 32+ random characters. Used to hash sign-in codes. |
| `RESEND_API_KEY` | Resend API key. |
| `RESEND_FROM` | Sender, e.g. `kotes <noreply.kotes@your-domain.com>`, on a domain verified in Resend. |

All of these are server-only. The browser only ever talks to `/api/*`. In production the server refuses to start if any of them is missing.

Optional: `MAX_CODES_PER_HOUR` (default 300; a global cap on sign-in emails that protects your Resend quota) and `DATABASE_POOL_MAX` (default 5).

## Deploy (home server, Docker)

```bash
git clone <your repo> kotes && cd kotes
cp .env.example .env        # fill it in, using the Session pooler for DATABASE_URL
docker compose up -d --build
```

- The container listens on `127.0.0.1:3000`. Put it behind something that terminates **HTTPS**, such as Cloudflare Tunnel, Caddy or nginx. In production, sign-in cookies are `Secure`, so signing in over plain `http://` won't work.
- The proxy must pass the real client IP (`CF-Connecting-IP` or `X-Forwarded-For`), because the per-IP rate limits key on it. Don't expose port 3000 to the internet directly.
- `GET /api/health` returns `{"ok":true}` when the server can reach the database. Docker uses it as the container health check.
- Without Docker: `npm ci && npm run build`, copy `.next/static` → `.next/standalone/.next/static` and `public` → `.next/standalone/public`, then run `node .next/standalone/server.js` with the environment variables set.
- Database changes: run `npm run db:apply` from any machine that has `DATABASE_URL`. It's safe to re-run.

## How sign-in works

1. `POST /api/auth/code` creates a random 6-digit code, stores an HMAC of it (never the code itself), and emails it through the Resend API. A code lasts 10 minutes. You can ask for one every 60 seconds, up to 5 an hour per email. Asking for a new code cancels the old one.
2. `POST /api/auth/verify` checks the code in constant time. Each code allows 5 tries and works once. On success it finds or creates the reader and starts a session.
3. The session is a random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (also `Secure` in production). The database stores only its SHA-256 hash. Sessions last 90 days and are extended once a day while in use.
4. `POST /api/auth/signout` deletes the session.

POST routes only accept JSON. Combined with `SameSite=Lax`, that blocks cross-site form attacks.

**Limits:** per email, one code per 60s and 5 per hour; per IP, 10 code requests per hour and 30 verify attempts per 10 minutes; across the whole app, `MAX_CODES_PER_HOUR`. The per-IP limits live in memory, which is right for one server. With several instances, move them to the database or Redis.

**Account deletion:** *You → Delete my account* calls `DELETE /api/me`. It removes the reader, their sessions, taste, likes, saves and views, and their login codes.

**Headers:** in production every response carries CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a permissions policy, and `/api/*` is `no-store`.

## Database

Everything lives in the private `kotes` schema ([`supabase/schema.sql`](supabase/schema.sql)). Supabase's REST and GraphQL APIs don't expose it, and the `anon` and `authenticated` roles have no access to it. Only the Next.js server reaches it, over TLS verified against Supabase's root CA ([`src/server/supabase-ca.mjs`](src/server/supabase-ca.mjs)).

| Table | Holds |
| --- | --- |
| `readers` | one row per email |
| `login_codes` | hashed one-time codes |
| `sessions` | hashed session tokens |
| `quotes` | the library |
| `tastes`, `reactions`, `views` | what each reader likes, keeps and lingers on |

`kotes.sweep()` deletes expired codes and sessions. The server also runs it now and then by itself.

## How the feed learns

Each reader has a weight for every theme (`love`, `stoic`, …) and for every author (`by:Seneca`). Authors are never shown on screen, but they still shape the feed.

| Signal | Effect on the quote's themes (authors get 0.6×) |
| --- | --- |
| Pick a theme at onboarding | weight set to at least 4 |
| Like (double-tap or ♥) | +3 (undo −3) |
| Keep (bookmark) | +5 (undo −5) |
| First view: under 1.5s | −0.5 (skipped) |
| First view: 1.5–5s | +0.25 |
| First view: over 5s | +1 (lingered) |

`kotes.get_feed()` puts unseen quotes first. Among those, it runs a **weighted random race**: each quote's chance grows exponentially with how well it matches the reader's taste. The feed leans towards what you like but keeps exploring. Once every quote has been seen, it recycles them the same way.

## Fonts

The fonts are self-hosted from [`src/fonts`](src/fonts) as static, Latin-only WOFF2 files (OFL licences included), about 250 KB in total. Google serves these families as *variable* fonts, which caused two problems:

- WebKit (every iPhone browser) rendered them at their thinnest weight: Manrope 200, Cormorant 300, Bodoni 400.
- Bodoni's optical-size axis shrank its hairlines to nothing at headline sizes.

[`scripts/build-fonts.py`](scripts/build-fonts.py) builds each weight as its own file, with Bodoni fixed at optical size 28.

## Adding quotes

Edit [`src/data/quotes.json`](src/data/quotes.json), then run `npm run seed:sql` and `npm run db:apply`. Existing quotes are skipped.

## Layout

```
src/app/            landing, login, onboarding, feed, library ("Kept"), you
src/app/api/        auth (code, verify, signout), me, feed, reactions, views, library, taste, health
src/server/         db pool, auth, rate limits, Resend email, data access (server-only)
src/fonts/          static WOFF2 fonts (built by scripts/build-fonts.py)
src/lib/backend.ts  the browser's typed client for /api
supabase/           schema.sql, seed.sql (generated), cleanup-supabase-auth.sql (one-off)
```
