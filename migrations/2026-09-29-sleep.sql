-- Sleep tracking
-- Run once in the Supabase SQL editor.

-- One row per "fell asleep" / "woke up" event. Sessions are paired up client-side.
create table if not exists sleep_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  kind text not null check (kind in ('sleep', 'wake')),
  time timestamptz not null,
  is_estimate boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sleep_events_family_id_time_idx on sleep_events(family_id, time desc);

-- Days whose naps weren't tracked: only morning wake-up and bedtime count in statistics.
-- `day` is the local date the day starts on (per families.day_break_hour).
create table if not exists sleep_excluded_days (
  family_id uuid not null references families(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (family_id, day)
);

alter table sleep_events enable row level security;
alter table sleep_excluded_days enable row level security;

drop policy if exists "Allow all on sleep_events" on sleep_events;
create policy "Allow all on sleep_events" on sleep_events for all using (true) with check (true);
drop policy if exists "Allow all on sleep_excluded_days" on sleep_excluded_days;
create policy "Allow all on sleep_excluded_days" on sleep_excluded_days for all using (true) with check (true);

alter publication supabase_realtime add table sleep_events;
alter publication supabase_realtime add table sleep_excluded_days;
