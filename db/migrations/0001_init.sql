-- Antonia: initial schema.
--
-- Every row of client data carries `trainer_id`. Row Level Security limits each
-- authenticated user to rows where trainer_id = auth.uid(), and composite
-- foreign keys (child.trainer_id must equal parent.trainer_id) make it
-- impossible for one trainer's row to reference another trainer's data.
-- Adding more trainers later needs no schema change.

create table public.trainers (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  timezone     text not null default 'America/New_York' check (char_length(timezone) <= 64),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  trainer_id        uuid not null references public.trainers (id) on delete cascade,
  full_name         text not null check (char_length(btrim(full_name)) between 1 and 120),
  kind              text not null default 'personal_training'
                    check (kind in ('fitness_assessment', 'personal_training')),
  status            text not null default 'active'
                    check (status in ('active', 'on_hold', 'inactive')),
  primary_goal      text check (char_length(primary_goal) <= 1000),
  health_notes      text check (char_length(health_notes) <= 2000),
  email             text check (char_length(email) <= 254),
  phone             text check (char_length(phone) <= 40),
  start_date        date,
  assessment_date   date,
  next_review_date  date,
  last_reviewed_on  date,
  session_length_min integer check (session_length_min between 5 and 240),
  sessions_per_week numeric(3, 1) check (sessions_per_week > 0 and sessions_per_week <= 14),
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, trainer_id)
);
create index clients_trainer_idx on public.clients (trainer_id, archived_at, full_name);
create index clients_review_idx on public.clients (trainer_id, next_review_date)
  where archived_at is null;

create table public.exercises (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  name_key   text generated always as (lower(btrim(name))) stored,
  created_at timestamptz not null default now(),
  unique (id, trainer_id),
  unique (trainer_id, name_key)
);

create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null,
  client_id    uuid not null,
  session_date date not null,
  focus        text check (char_length(focus) <= 120),
  notes        text check (char_length(notes) <= 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, trainer_id),
  foreign key (client_id, trainer_id) references public.clients (id, trainer_id) on delete cascade
);
create index sessions_client_date_idx on public.sessions (client_id, session_date desc);
create index sessions_trainer_date_idx on public.sessions (trainer_id, session_date desc);

-- Exercise references are checked at commit (deferrable) so deleting a whole trainer
-- account cascades cleanly, while an exercise that still has history cannot be deleted alone.
-- One row per exercise performed in a session. `sets` is an ordered array of
-- {reps?: int, weight?: number (lb), seconds?: int}; every field is optional
-- because the existing paper log mixes weighted, timed and bodyweight work.
create table public.session_entries (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null,
  session_id  uuid not null,
  exercise_id uuid not null,
  position    integer not null default 0,
  sets        jsonb not null default '[]'
              check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) <= 30),
  notes       text check (char_length(notes) <= 2000),
  foreign key (session_id, trainer_id) references public.sessions (id, trainer_id) on delete cascade,
  foreign key (exercise_id, trainer_id) references public.exercises (id, trainer_id) deferrable initially deferred
);
create index session_entries_session_idx on public.session_entries (session_id, position);
create index session_entries_exercise_idx on public.session_entries (exercise_id);

create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null,
  client_id    uuid not null,
  kind         text not null check (kind in ('lift', 'general')),
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  exercise_id  uuid,
  target_value numeric(7, 2) check (target_value > 0),
  target_date  date,
  status       text not null default 'active' check (status in ('active', 'achieved', 'dropped')),
  achieved_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (client_id, trainer_id) references public.clients (id, trainer_id) on delete cascade,
  foreign key (exercise_id, trainer_id) references public.exercises (id, trainer_id) deferrable initially deferred,
  check (kind <> 'lift' or (exercise_id is not null and target_value is not null))
);
create index goals_client_idx on public.goals (client_id, status);

create table public.metrics (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  client_id  uuid not null,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  unit       text not null default '' check (char_length(unit) <= 16),
  direction  text not null default 'neutral' check (direction in ('up', 'down', 'neutral')),
  created_at timestamptz not null default now(),
  unique (id, trainer_id),
  foreign key (client_id, trainer_id) references public.clients (id, trainer_id) on delete cascade
);
create unique index metrics_client_name_idx on public.metrics (client_id, lower(btrim(name)));

create table public.metric_entries (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  metric_id  uuid not null,
  entry_date date not null,
  value      numeric(9, 2) not null check (value between -100000 and 100000),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key (metric_id, trainer_id) references public.metrics (id, trainer_id) on delete cascade,
  unique (metric_id, entry_date)
);

create table public.client_notes (
  id         uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  client_id  uuid not null,
  body       text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, trainer_id) references public.clients (id, trainer_id) on delete cascade
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

-- updated_at maintenance -----------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trainers_touch before update on public.trainers
  for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();
create trigger client_notes_touch before update on public.client_notes
  for each row execute function public.touch_updated_at();

-- A trainer profile is created automatically for every auth user. ------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trainers (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security ---------------------------------------------------------
alter table public.trainers        enable row level security;
alter table public.clients         enable row level security;
alter table public.exercises       enable row level security;
alter table public.sessions        enable row level security;
alter table public.session_entries enable row level security;
alter table public.goals           enable row level security;
alter table public.metrics         enable row level security;
alter table public.metric_entries  enable row level security;
alter table public.client_notes    enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select, update on public.trainers to authenticated;
grant select, insert, update, delete on
  public.clients, public.exercises, public.sessions, public.session_entries,
  public.goals, public.metrics, public.metric_entries, public.client_notes
  to authenticated;

create policy trainers_own on public.trainers for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy clients_own on public.clients for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy exercises_own on public.exercises for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy sessions_own on public.sessions for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy session_entries_own on public.session_entries for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy goals_own on public.goals for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy metrics_own on public.metrics for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy metric_entries_own on public.metric_entries for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
create policy client_notes_own on public.client_notes for all to authenticated
  using (trainer_id = (select auth.uid())) with check (trainer_id = (select auth.uid()));
