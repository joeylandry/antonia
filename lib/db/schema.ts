/**
 * The whole schema. Applied on every start; `if not exists` makes it a no-op once created.
 * Dates are 'YYYY-MM-DD' text, timestamps ISO-8601 text, `sets` a JSON array.
 */
export const SCHEMA = `
create table if not exists profile (
  id           integer primary key check (id = 1),
  display_name text not null default '' check (length(display_name) <= 80),
  timezone     text not null default 'America/New_York' check (length(timezone) <= 64)
);
insert or ignore into profile (id) values (1);

create table if not exists clients (
  id                 text primary key,
  full_name          text not null check (length(trim(full_name)) between 1 and 120),
  kind               text not null default 'personal_training' check (kind in ('fitness_assessment', 'personal_training')),
  status             text not null default 'active' check (status in ('active', 'on_hold', 'inactive')),
  primary_goal       text check (length(primary_goal) <= 1000),
  health_notes       text check (length(health_notes) <= 2000),
  email              text check (length(email) <= 254),
  phone              text check (length(phone) <= 40),
  start_date         text,
  assessment_date    text,
  next_review_date   text,
  last_reviewed_on   text,
  session_length_min integer check (session_length_min between 5 and 240),
  sessions_per_week  real check (sessions_per_week > 0 and sessions_per_week <= 14),
  archived_at        text,
  created_at         text not null,
  updated_at         text not null
);

create table if not exists exercises (
  id         text primary key,
  name       text not null check (length(trim(name)) between 1 and 80),
  name_key   text not null unique,
  created_at text not null
);

create table if not exists sessions (
  id           text primary key,
  client_id    text not null references clients (id) on delete cascade,
  session_date text not null,
  focus        text check (length(focus) <= 120),
  notes        text check (length(notes) <= 4000),
  created_at   text not null,
  updated_at   text not null
);
create index if not exists sessions_client_date_idx on sessions (client_id, session_date);

create table if not exists session_entries (
  id          text primary key,
  session_id  text not null references sessions (id) on delete cascade,
  exercise_id text not null references exercises (id),
  position    integer not null default 0,
  sets        text not null default '[]' check (json_valid(sets) and json_type(sets) = 'array' and json_array_length(sets) <= 30),
  notes       text check (length(notes) <= 2000)
);
create index if not exists session_entries_session_idx on session_entries (session_id, position);
create index if not exists session_entries_exercise_idx on session_entries (exercise_id);

create table if not exists goals (
  id           text primary key,
  client_id    text not null references clients (id) on delete cascade,
  kind         text not null check (kind in ('lift', 'general')),
  title        text not null check (length(trim(title)) between 1 and 200),
  exercise_id  text references exercises (id),
  target_value real check (target_value > 0),
  target_date  text,
  status       text not null default 'active' check (status in ('active', 'achieved', 'dropped')),
  achieved_on  text,
  created_at   text not null,
  updated_at   text not null,
  check (kind <> 'lift' or (exercise_id is not null and target_value is not null))
);
create index if not exists goals_client_idx on goals (client_id, status);

create table if not exists metrics (
  id         text primary key,
  client_id  text not null references clients (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 60),
  unit       text not null default '' check (length(unit) <= 16),
  direction  text not null default 'neutral' check (direction in ('up', 'down', 'neutral')),
  created_at text not null
);
create unique index if not exists metrics_client_name_idx on metrics (client_id, lower(trim(name)));

create table if not exists metric_entries (
  id         text primary key,
  metric_id  text not null references metrics (id) on delete cascade,
  entry_date text not null,
  value      real not null check (value between -100000 and 100000),
  note       text check (length(note) <= 500),
  created_at text not null,
  unique (metric_id, entry_date)
);

create table if not exists client_notes (
  id         text primary key,
  client_id  text not null references clients (id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 5000),
  created_at text not null,
  updated_at text not null
);
create index if not exists client_notes_client_idx on client_notes (client_id, created_at);

-- Sign-in: only hashes of session tokens are stored, never the tokens themselves.
create table if not exists auth_sessions (
  token_hash  text primary key,
  passcode_id text not null,
  created_at  integer not null,
  expires_at  integer not null
);

create table if not exists login_failures (
  ip text not null,
  at integer not null
);
create index if not exists login_failures_at_idx on login_failures (at);
`;
