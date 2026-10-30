# FitnessTracker

Client management and progress tracking for a personal trainer (built for Antonia). Private: one passcode, one trainer.

- Log sessions (exercise, sets, reps, weight, timed holds) with last-time hints.
- Charts per exercise with date ranges, lift goals with live progress, optional body measurements.
- A Today screen that surfaces overdue reviews, goals coming due and clients who have gone quiet.
- Light and dark themes, responsive down to a phone.
- CSV export per client and a full JSON backup.

Background on what this replaces and every assumption made: [docs/discovery.md](docs/discovery.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Radix UI primitives · Recharts · Postgres (`postgres.js`) · Zod · Vitest · Playwright.

No auth service, no accounts, no API keys. Data lives in one Postgres database (on Vercel: the free Neon database from the Storage tab). The app creates its own tables on first use, in a schema named `app`; there is no migration step.

## How it fits together

```
browser ── Next.js (server components + server actions) ── Postgres (DATABASE_URL), tables in schema `app`
proxy.ts            sends visitors without a session cookie to /login (optimistic only)
lib/auth.ts         passcode sign-in, brute-force limits, server-side sessions; every page, action and route re-checks
lib/passcode.ts     scrypt hashing of the passcode
lib/db/             connects to Postgres and creates the schema on first use
```

### How the passcode is protected

- **Only a hash is stored.** The passcode itself is never saved anywhere. `PASSCODE_HASH` holds a salted **scrypt** hash (memory-hard, so even someone who steals it can't guess quickly with GPUs), compared in constant time.
- **Brute-force limits.** 5 wrong tries per address and 10 wrong tries across the whole site in any 15 minutes, then sign-in pauses. The site-wide limit can't be dodged by switching IP addresses. Every attempt is counted before it is checked, so firing guesses in parallel doesn't help. Already signed-in devices keep working during a pause.
- **Server-side sessions.** Unlocking issues a random 256-bit token in an `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` cookie, valid 30 days. The server stores only the token's SHA-256, so the database contents can't be used to make a cookie. Signing out deletes the session on the server, and changing the passcode ends every session.
- **Minimum length 10.** `npm run passcode` refuses anything shorter. A short phrase of four or more words is easy to type and hard to guess.
- Fails closed: if `PASSCODE_HASH` is missing or malformed, nobody can get in.
- The usual headers: Content-Security-Policy, no framing, nosniff, HSTS (`next.config.ts`). Pages are `noindex`.

## Set the passcode

```bash
npm install
npm run passcode          # type the passcode twice (hidden); prints PASSCODE_HASH=scrypt:...
```

Put that line in `.env.local` (on your own computer) or in the host's environment variables (when deployed), then (re)start the app. To change the passcode later, do the same again; every device is signed out.

## Deploy (Vercel)

1. In the Vercel project, open **Storage → Create Database**, pick **Neon** (Postgres, free plan) and connect it to the project. This adds `DATABASE_URL` for you. If the project still has old Supabase variables (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`), delete them first so Neon's `DATABASE_URL` takes their place.
2. Under **Settings → Environment Variables**, add `PASSCODE_HASH` with the output of `npm run passcode` (just the part after `PASSCODE_HASH=`).
3. Redeploy. Open the site, enter the passcode, and set your name and time zone under Settings.

Any other Node 22+ host works the same way: set `DATABASE_URL` (any Postgres 14+) and `PASSCODE_HASH`, then `npm ci && npm run build && npm start`. Serve it over **HTTPS**: the session cookie is `Secure`, so sign-in won't stick on plain `http://` except on `localhost`.

**Backups.** Neon keeps point-in-time history (on the free plan, a short window); Settings → "Download all data" gives a portable JSON copy any time. Keep a copy somewhere other than the database.

## Develop

```bash
npm install
npm run passcode          # put the printed line in .env.local
# and in .env.local: DATABASE_URL=postgres://... (the Neon one, or any local Postgres 14+)
npm run dev
```

### Checks

```bash
npm run typecheck && npm run lint
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/antonia_test npm test   # database tests are skipped without it
E2E_ADMIN_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres npm run test:e2e   # creates a throwaway antonia_e2e database
```

## Known limitations

- Weights are pounds only; there is no unit setting yet.
- No import from the existing Excel workbook (needs the real file).
- One passcode for the whole site; there are no separate accounts.
- A forgotten passcode can't be recovered, only replaced (`npm run passcode`); the data is untouched.
- Theme preference is stored per device, not per account.
