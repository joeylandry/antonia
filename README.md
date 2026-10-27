# Antonia

Client management and progress tracking for a personal trainer. Private, single-trainer today, multi-trainer ready.

- Log sessions (exercise, sets, reps, weight, timed holds) with last-time hints.
- Charts per exercise with date ranges, lift goals with live progress, optional body measurements.
- A Today screen that surfaces overdue reviews, goals coming due and clients who have gone quiet.
- Light and dark themes, responsive down to a phone.
- CSV export per client and a full JSON backup.

Background on what this replaces and every assumption made: [docs/discovery.md](docs/discovery.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Radix UI primitives · Recharts · Supabase Auth + Postgres · Zod · Vitest · Playwright.

**Why direct Postgres and not the Supabase REST client?** Auth is Supabase's (hosted password handling, email, rate limiting). Data access uses `postgres.js` from the server, inside a transaction that sets the signed-in user and switches to Supabase's non-bypassing `authenticated` role, so **Row Level Security is the authority** and a coding mistake cannot leak another trainer's rows. Queries stay readable SQL, aggregates are easy, and the same schema is testable against plain Postgres.

## How it fits together

```
browser ── Next.js (server components + server actions) ──┬─ Supabase Auth  (sessions, passwords, reset email)
                                                          └─ Postgres       (RLS: trainer_id = auth.uid())
proxy.ts   refreshes the session cookie, redirects signed-out visitors (optimistic only)
lib/auth.ts  every page, action and route re-verifies the user with the auth server
lib/db/client.ts  withTrainer(): set claims + role 'authenticated' for the transaction
db/migrations  schema, constraints, RLS policies
```

Every row of client data has a `trainer_id`; composite foreign keys make cross-trainer references impossible; RLS limits reads and writes to the owner. A second trainer needs no schema change, only an account.

Layout: `app/` routes · `components/` UI (`components/ui` is the design-system primitives) · `lib/domain` pure logic (unit tested) · `lib/data` SQL access · `lib/validation` Zod schemas shared by forms and server actions · `db/` migrations and local shim · `e2e/` browser tests.

## Deploy

1. **Supabase project** (free tier is fine). Under *Authentication → Providers*, keep Email enabled and **turn off "Allow new users to sign up"**. Create Antonia's account under *Authentication → Users → Add user* (tick "Auto Confirm User").
2. **Email template** for password reset (*Authentication → Email Templates → Reset Password*): set the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   and set *Site URL* and *Redirect URLs* to your deployed origin.
3. **Apply the schema:** `DATABASE_URL="<direct or session-pooler connection string>" npm run db:migrate` (safe to re-run; each migration applies once).
4. **Host** on Vercel (or any Node host). Set environment variables:

   | Variable | Where to find it | Secret? |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | no |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API (publishable / anon key) | no, RLS protects data |
   | `DATABASE_URL` | Project Settings → Database → Connection string, **transaction pooler (port 6543)** | **yes** |
   | `NEXT_PUBLIC_SITE_URL` | your deployed origin, e.g. `https://app.example.com` | no |

5. Sign in, set your name and time zone under Settings.

Backups: Supabase takes daily backups on paid plans; Settings → "Download all data" gives a portable JSON copy any time.

## Develop

```bash
npm install
cp .env.example .env.local        # point at a Supabase project, or use the local stack below
npm run dev
```

### Local stack without Supabase (what the tests use)

Needs any Postgres 14+ you can create databases in.

```bash
export E2E_ADMIN_DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres
createdb antonia_dev
psql antonia_dev -f db/dev/supabase-shim.sql    # roles + auth.uid() that Supabase normally provides
DATABASE_URL=postgres://postgres@127.0.0.1:5432/antonia_dev npm run db:migrate
```

`e2e/support/fake-auth-server.mjs` is a **test-only** stand-in for the few Supabase Auth endpoints the app uses. It exists so the browser suite runs without Docker. It is never used in production. For day-to-day development against the real thing, use a Supabase project or `supabase start`.

`npm run db:seed:dev -- you@example.test` fills a **local** database with fictional clients (it refuses non-localhost URLs).

### Checks

```bash
npm run typecheck && npm run lint
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/antonia_dev npm test   # unit + database isolation tests
E2E_ADMIN_DATABASE_URL=... npm run test:e2e                                  # builds the app, runs the browser suite
```

## Known limitations

- Weights are pounds only; there is no unit setting yet.
- No import from the existing Excel workbook (needs the real file).
- One trainer per deployment in practice: there is no sign-up or invite flow, by design. Accounts are created in Supabase.
- Theme preference is stored per device, not per account.
- Password-reset email delivery uses Supabase's built-in mailer (rate limited); configure custom SMTP in Supabase for production volume.
