# kotes.

The feed that reads you back. An endless, mobile-only quote feed for readers. You can like and keep quotes, and the feed learns your taste from what you do.

- **Stack:** Next.js 16 (App Router) · Postgres on Supabase · Resend
- **Auth:** kotes' own passwordless email codes. Supabase Auth is not used.
- **Fonts:** DM Serif Display (display), EB Garamond (quotes), Manrope (interface), self-hosted as static files (see [Fonts](#fonts))
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
| `DATABASE_URL` | The app's **least-privilege** `kotes_app` login. The direct host (`db.<ref>.supabase.co`) is IPv6-only. In Docker or on IPv4 networks, use the **Session pooler** (`aws-0-<region>.pooler.supabase.com:5432`, user `kotes_app.<ref>`). |
| `DATABASE_ADMIN_URL` | The `postgres` login, used **only** by `npm run db:apply`. Keep it off the app server. |
| `APP_DB_PASSWORD` | `kotes_app`'s password. `db:apply` sets it on the role. Not needed on the app server. |
| `AUTH_SECRET` | 32+ random characters. Used to hash sign-in codes. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile keys (the human check). Empty = off. |
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

- The server's `.env` needs only `DATABASE_URL` (the `kotes_app` pooler string), `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` and the Turnstile keys. Never the admin URL.
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

**Limits:** see [Security](#security).

**Account deletion:** *You → Delete my account* calls `DELETE /api/me`. It removes the reader, their sessions, taste, likes, saves and views, and their login codes.

**Headers:** in production every response carries CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a permissions policy, and `/api/*` is `no-store`.

## Security

Layered so that no single failure exposes readers. Every item below was tested against a production build with automated attack scripts.

**Bots and AI agents**
- **Cloudflare Turnstile** on the sign-in step. It's invisible for most people and shows a checkbox only when unsure. The server verifies every token with Cloudflare and fails closed if it can't.
- **Honeypot field** and the browser's **automation flag** (`navigator.webdriver`, set by Selenium, Playwright, Puppeteer and most agent browsers). Both get a *fake* "code sent", so bots learn nothing.
- **robots.txt** turns away ~35 AI crawlers and scrapers by name, and all bots from the app and API. `X-Robots-Tag: noindex…` on private pages and `noai, noimageai` everywhere.
- **Per-reader limits** far above human reading speed: 40 feed batches (320 quotes) per 10 min. Signed-in scrapers hit the ceiling fast.

**Sign-in**
- Codes: 6 digits, HMAC-hashed, 10 min, single use, 5 tries each.
- Per email: one code per 60 s, 5 per hour, 10 per day (blunts email bombing); **15 wrong guesses per day locks the email** for the rest of the day. That caps a determined attacker at about 0.5% odds per year against one account.
- Per IP: 20 code requests per hour, 30 verifies per 10 min (loose, since mobile carriers share IPs). App-wide: `MAX_CODES_PER_HOUR`.
- Strict email format: no quotes, commas or angle brackets ever reach the mail provider.

**Sessions and requests**
- Session cookie `__Host-kotes_session`: `Secure`, `HttpOnly`, `SameSite=Strict`, and no other `*.mayurmundankar.com` site can set or overwrite it. 256-bit random token, stored only as SHA-256.
- CSRF is blocked three ways: `Sec-Fetch-Site`/`Origin` must be same-origin, bodies must be JSON, and the cookie is Strict.
- Request bodies are capped at 16 KB; every API route has a per-IP ceiling.
- Headers: strict CSP (self + Turnstile only, no framing), HSTS (2 years), COOP, CORP, `nosniff`, no referrer leakage, browser features off.

**Database**
- The app connects as **`kotes_app`** ([`supabase/app-role.sql`](supabase/app-role.sql)): only the `kotes` schema, only the operations kotes performs (quotes are read-only), no DDL, no access to Supabase's auth, storage or Vault, and a **5 s statement timeout**. The server warns at startup if it's given any other login.
- The `kotes` schema isn't exposed by Supabase's REST/GraphQL APIs, and RLS denies `anon`/`authenticated` everything.
- TLS to the database is verified against Supabase's root CA. Every query uses bound parameters.

**Container**
- Read-only filesystem, all Linux capabilities dropped, `no-new-privileges`, memory/CPU/process limits, non-root user, no npm in the image, dependencies installed with install scripts disabled, logs rotated.
- Security events are JSON lines: `docker logs kotes 2>&1 | grep '"sec"'` (emails are pseudonymised tags).

**Do these in the dashboards (code can't):**
1. **Cloudflare → Turnstile → Add widget** for `kotes.mayurmundankar.com` (mode: *Managed*). Put the keys in the server's `.env`.
2. **Cloudflare → Security → Bots:** turn on **Block AI bots** and **Bot Fight Mode**. Optionally turn on **AI Labyrinth**, which traps crawlers that ignore robots.txt.
3. **Cloudflare → Security → WAF → Rate limiting rules:** e.g. `/api/auth/` at 10 requests/min per IP, block for 10 min. This stops floods before they reach your server.
4. **Cloudflare → SSL/TLS:** mode *Full (strict)*, plus *Always Use HTTPS* and *Minimum TLS 1.2*.
5. **Supabase → Database → Settings:** reset the `postgres` password (it was shared during setup), then update `DATABASE_ADMIN_URL` wherever you run `db:apply`.
6. **Supabase → Authentication:** keep email sign-ups off and the Send Email hook off. kotes doesn't use Supabase Auth.

## Database

In the Supabase dashboard, the tables appear under **Table Editor → schema `kotes`** (not `public`). Everything lives in the private `kotes` schema ([`supabase/schema.sql`](supabase/schema.sql)). Supabase's REST and GraphQL APIs don't expose it, and the `anon` and `authenticated` roles have no access to it. Only the Next.js server reaches it, over TLS verified against Supabase's root CA ([`src/server/supabase-ca.mjs`](src/server/supabase-ca.mjs)).

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

**Your themes** (`kotes.fav_themes()`) are the ones you picked, plus any theme you've liked or kept 2+ quotes from. Only explicit choices count, so lingering can't quietly add themes. Readers who signed up before picks were recorded use their 3 strongest themes until they retune. The You page shows exactly this set.

`kotes.get_feed()` fills about 85% of each batch (7 of 8) from your themes and keeps the rest for exploring. Within each group, unseen quotes come first, then a **weighted random race**: each quote's chance grows exponentially with how well it matches your taste. When a group runs short, the other fills in, and once everything has been seen, it recycles.

## Sharing

Share opens a preview of a 1080×1920 story image, drawn on a canvas in the browser with the app's fonts and the card's colour (switchable). On phones, **Share to stories & chats** passes the image file to the system share sheet, which lists Instagram, Facebook, WhatsApp and so on. Elsewhere it's saved as a PNG. The header and footer stay out of the top and bottom 250 px, which Instagram and WhatsApp cover with their own controls.

Links to the site preview with [`public/og.png`](public/og.png), a 1200×630 card in the hero's style. To change it, edit [`scripts/og/og.html`](scripts/og/og.html) and run `npm run og` (needs `npm i -D playwright` and `npx playwright install chromium`). `SITE_URL` (default `https://kotes.mayurmundankar.com`) sets the absolute URL used in previews, and is read at build time.

## Fonts

The fonts are self-hosted from [`src/fonts`](src/fonts) as static, Latin-only WOFF2 files (OFL licences included), about 190 KB in total. [`scripts/build-fonts.py`](scripts/build-fonts.py) builds them from Google Fonts' sources. Two lessons shaped this:

- **Static, not variable.** WebKit (every iPhone browser) rendered variable fonts at their thinnest weight.
- **Sturdy hairlines.** Bodoni Moda and Cormorant Garamond look luxurious, but their thinnest strokes vanished on phone screens: the italic "kotes" read as "koles". DM Serif Display and EB Garamond keep that look and hold up at phone resolution.

## Speed

- **Sessions are remembered on the device.** Returning readers see their pages at once, and `/api/me` re-checks the session in the background, also returning whether onboarding is done.
- **Sessions are cached on the server for 60 s.** Most API calls cost a single database round trip.
- **Database connections stay open and are warmed at startup.** Opening one to Supabase costs about a second.
- **Views are batched.** The feed sends them every 5 seconds, every 8 views, or when the page is hidden, never one request per card.

The database round trip from India to the Tokyo Supabase region is about 125 ms, and it now sets the floor for every API call. Moving the project to Mumbai (`ap-south-1`) would cut that to about 20–30 ms: create a project there, run `npm run db:apply`, and switch `DATABASE_URL`.

## Adding quotes

Edit [`src/data/quotes.json`](src/data/quotes.json), then run `npm run seed:sql` and `npm run db:apply`. Existing quotes are skipped.

## Layout

```
src/app/            landing, login, onboarding, feed, library ("Kept"), you, privacy
src/app/api/        auth (code, verify, signout), me, feed, reactions, views, library, taste, health
src/server/         db pool, auth, rate limits, Resend email, data access (server-only)
src/fonts/          static WOFF2 fonts (built by scripts/build-fonts.py)
src/lib/backend.ts  the browser's typed client for /api
supabase/           schema.sql, seed.sql (generated), no-em-dashes.sql, cleanup-supabase-auth.sql (one-off)
scripts/og/         source and renderer for public/og.png
```
