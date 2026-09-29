-- Baby Feed Tracker - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Create families table
create table families (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  default_amount_ml integer not null default 100,
  feeding_interval_minutes integer not null default 180,
  feeding_span_minutes integer not null default 60,
  day_break_hour integer not null default 5,
  current_formula text not null default '',
  chart_rolling_days integer not null default 3,
  created_at timestamptz not null default now()
);

-- Create feedings table
create table feedings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  amount_ml integer not null,
  time timestamptz not null,
  is_estimate boolean not null default false,
  -- real food (not formula): amount_ml then holds kcal instead of ml
  is_food boolean not null default false,
  vitamin_d boolean not null default false,
  probiotics boolean not null default false,
  omega3 boolean not null default false,
  formula text not null default '',
  created_at timestamptz not null default now()
);

-- Create sleep_events table: one row per "fell asleep" / "woke up" event
create table sleep_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  kind text not null check (kind in ('sleep', 'wake')),
  time timestamptz not null,
  is_estimate boolean not null default false,
  created_at timestamptz not null default now()
);

-- Days whose naps weren't tracked: only morning wake-up and bedtime count in statistics
create table sleep_excluded_days (
  family_id uuid not null references families(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (family_id, day)
);

-- Indexes
create index feedings_family_id_time_idx on feedings(family_id, time desc);
create index sleep_events_family_id_time_idx on sleep_events(family_id, time desc);
create index families_code_idx on families(code);

-- Enable RLS
alter table families enable row level security;
alter table feedings enable row level security;
alter table sleep_events enable row level security;
alter table sleep_excluded_days enable row level security;

-- RLS policies (public access via anon key - auth is via family code)
create policy "Allow all on families" on families for all using (true) with check (true);
create policy "Allow all on feedings" on feedings for all using (true) with check (true);
create policy "Allow all on sleep_events" on sleep_events for all using (true) with check (true);
create policy "Allow all on sleep_excluded_days" on sleep_excluded_days for all using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table feedings;
alter publication supabase_realtime add table sleep_events;
alter publication supabase_realtime add table sleep_excluded_days;

-- Migration: add chart_rolling_days (run if table already exists)
-- alter table families add column if not exists chart_rolling_days integer not null default 3;
-- Migration: add feeding_span_minutes (run if table already exists)
-- alter table families add column if not exists feeding_span_minutes integer not null default 60;
-- Migration: add omega3 (run if table already exists)
-- alter table feedings add column if not exists omega3 boolean not null default false;
-- Migration: add is_food (run if table already exists)
-- alter table feedings add column if not exists is_food boolean not null default false;
-- Migration: sleep tracking (run if tables don't exist) — see migrations/2026-09-29-sleep.sql
