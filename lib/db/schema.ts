/**
 * The whole schema, in its own `app` schema so it never collides with tables
 * an older setup left in `public`. Applied on first use in each server
 * process; `if not exists` makes it a no-op once created, so changes must be
 * additive and safe to re-run.
 */
export const SCHEMA = `
create schema if not exists app;

create table if not exists app.profile (
  id           integer primary key check (id = 1),
  display_name text not null default '' check (char_length(display_name) <= 80),
  timezone     text not null default 'America/New_York' check (char_length(timezone) <= 64)
);
insert into app.profile (id) values (1) on conflict do nothing;

create table if not exists app.clients (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null check (char_length(btrim(full_name)) between 1 and 120),
  kind               text not null default 'personal_training' check (kind in ('fitness_assessment', 'personal_training')),
  status             text not null default 'active' check (status in ('active', 'on_hold', 'inactive')),
  primary_goal       text check (char_length(primary_goal) <= 1000),
  health_notes       text check (char_length(health_notes) <= 2000),
  email              text check (char_length(email) <= 254),
  phone              text check (char_length(phone) <= 40),
  start_date         date,
  assessment_date    date,
  next_review_date   date,
  last_reviewed_on   date,
  session_length_min integer check (session_length_min between 5 and 240),
  sessions_per_week  numeric(3, 1) check (sessions_per_week > 0 and sessions_per_week <= 14),
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists app.exercises (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  name_key   text generated always as (lower(btrim(name))) stored unique,
  created_at timestamptz not null default now()
);

create table if not exists app.sessions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references app.clients (id) on delete cascade,
  session_date date not null,
  focus        text check (char_length(focus) <= 120),
  notes        text check (char_length(notes) <= 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sessions_client_date_idx on app.sessions (client_id, session_date desc);

-- One row per exercise performed in a session. sets is an ordered array of
-- {reps?: int, weight?: number (lb), seconds?: int}.
create table if not exists app.session_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references app.sessions (id) on delete cascade,
  exercise_id uuid not null references app.exercises (id),
  position    integer not null default 0,
  sets        jsonb not null default '[]' check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) <= 30),
  notes       text check (char_length(notes) <= 2000)
);
create index if not exists session_entries_session_idx on app.session_entries (session_id, position);
create index if not exists session_entries_exercise_idx on app.session_entries (exercise_id);

create table if not exists app.goals (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references app.clients (id) on delete cascade,
  kind         text not null check (kind in ('lift', 'general')),
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  exercise_id  uuid references app.exercises (id),
  target_value numeric(7, 2) check (target_value > 0),
  target_date  date,
  status       text not null default 'active' check (status in ('active', 'achieved', 'dropped')),
  achieved_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (kind <> 'lift' or (exercise_id is not null and target_value is not null))
);
create index if not exists goals_client_idx on app.goals (client_id, status);

create table if not exists app.metrics (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references app.clients (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  unit       text not null default '' check (char_length(unit) <= 16),
  direction  text not null default 'neutral' check (direction in ('up', 'down', 'neutral')),
  created_at timestamptz not null default now()
);
create unique index if not exists metrics_client_name_idx on app.metrics (client_id, lower(btrim(name)));

create table if not exists app.metric_entries (
  id         uuid primary key default gen_random_uuid(),
  metric_id  uuid not null references app.metrics (id) on delete cascade,
  entry_date date not null,
  value      numeric(9, 2) not null check (value between -100000 and 100000),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (metric_id, entry_date)
);

create table if not exists app.client_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references app.clients (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_notes_client_idx on app.client_notes (client_id, created_at desc);

-- Sign-in: only hashes of session tokens are stored, never the tokens themselves.
create table if not exists app.auth_sessions (
  token_hash  text primary key,
  passcode_id text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create table if not exists app.login_failures (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists login_failures_at_idx on app.login_failures (at);
`;

/** Every table holding app data, for tests that start from empty. */
export const DATA_TABLES = [
  "app.client_notes",
  "app.metric_entries",
  "app.metrics",
  "app.goals",
  "app.session_entries",
  "app.sessions",
  "app.exercises",
  "app.clients",
  "app.auth_sessions",
  "app.login_failures",
];
