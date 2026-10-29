# FitnessTracker

Client management and progress tracking for a personal trainer (built for Antonia). Private: one passcode, one trainer.

- Log sessions (exercise, sets, reps, weight, timed holds) with last-time hints.
- Charts per exercise with date ranges, lift goals with live progress, optional body measurements.
- A Today screen that surfaces overdue reviews, goals coming due and clients who have gone quiet.
- Light and dark themes, responsive down to a phone.
- CSV export per client and a full JSON backup.

Background on what this replaces and every assumption made: [docs/discovery.md](docs/discovery.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Radix UI primitives · Recharts · SQLite (built into Node, `node:sqlite`) · Zod · Vitest · Playwright.

Nothing external: no database server, no auth service, no API keys. Everything lives in one file, `data/antonia.db`, that the app creates and manages itself.

## How it fits together

```
browser ── Next.js (server components + server actions) ── data/antonia.db (SQLite file on the server's disk)
proxy.ts            sends visitors without a session cookie to /login (optimistic only)
lib/auth.ts         passcode sign-in, brute-force limits, server-side sessions; every page, action and route re-checks
lib/passcode.ts     scrypt hashing of the passcode
lib/db/             opens the data file and creates the schema on first use
```

### How the passcode is protected

- **Only a hash is stored.** The passcode itself is never saved anywhere. `PASSCODE_HASH` holds a salted **scrypt** hash (memory-hard, so even someone who steals it can't guess quickly with GPUs), compared in constant time.
- **Brute-force limits.** 5 wrong tries per address and 10 wrong tries across the whole site in any 15 minutes, then sign-in pauses. The site-wide limit can't be dodged by switching IP addresses. Every attempt is counted before it is checked, so firing guesses in parallel doesn't help. Already signed-in devices keep working during a pause.
- **Server-side sessions.** Unlocking issues a random 256-bit token in an `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` cookie, valid 30 days. The server stores only the token's SHA-256, so the data file can't be used to make a cookie. Signing out deletes the session on the server, and changing the passcode ends every session.
- **Minimum length 10.** `npm run passcode` refuses anything shorter. A short phrase of four or more words is easy to type and hard to guess.
- Fails closed: if `PASSCODE_HASH` is missing or malformed, nobody can get in.
- The usual headers: Content-Security-Policy, no framing, nosniff, HSTS (`next.config.ts`). Pages are `noindex`.

## Set the passcode

```bash
npm install
npm run passcode          # type the passcode twice (hidden); prints PASSCODE_HASH=scrypt:...
```

Put that line in `.env.local` (on your own computer) or in the host's environment variables (when deployed), then (re)start the app. To change the passcode later, do the same again; every device is signed out.

## Deploy

The data file has to live on a disk that **survives restarts and redeploys**. Any Node 22+ host with a persistent disk works: a small VPS, Railway or Fly.io with a volume, Render with a disk, or a computer at home.

**Vercel will not work**: its disk is wiped constantly and every client record would be lost, so the app refuses to start there.

1. `npm ci && npm run build`
2. Set environment variables:

   | Variable | Value |
   | --- | --- |
   | `PASSCODE_HASH` | the output of `npm run passcode` |
   | `DATA_DIR` | folder on the persistent disk, e.g. `/data` (defaults to `./data`) |

3. `npm start` (port 3000; set `PORT` to change it). Serve it over **HTTPS**: the session cookie is `Secure`, so sign-in won't stick on plain `http://` except on `localhost`.
4. Open the site, enter the passcode, and set your name and time zone under Settings.

**Backups.** Everything is in `DATA_DIR/antonia.db` (plus `-wal`/`-shm` files while running). Copy the folder, or use Settings → "Download all data" for a portable JSON copy any time. Keep a copy somewhere other than the server.

## Develop

```bash
npm install
npm run passcode          # put the printed line in .env.local
npm run dev
```

### Checks

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e          # builds the app, runs the browser suite against a throwaway data folder
```

## Known limitations

- Weights are pounds only; there is no unit setting yet.
- No import from the existing Excel workbook (needs the real file).
- One passcode for the whole site; there are no separate accounts.
- A forgotten passcode can't be recovered, only replaced (`npm run passcode`); the data is untouched.
- Needs a host with a persistent disk (not Vercel).
- Theme preference is stored per device, not per account.
