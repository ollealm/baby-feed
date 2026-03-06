-- Baby Feed Tracker - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Create families table
create table families (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  default_amount_ml integer not null default 100,
  feeding_interval_minutes integer not null default 180,
  day_break_hour integer not null default 5,
  current_formula text not null default '',
  created_at timestamptz not null default now()
);

-- Create feedings table
create table feedings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  amount_ml integer not null,
  time timestamptz not null,
  is_estimate boolean not null default false,
  vitamin_d boolean not null default false,
  probiotics boolean not null default false,
  formula text not null default '',
  created_at timestamptz not null default now()
);

-- Indexes
create index feedings_family_id_time_idx on feedings(family_id, time desc);
create index families_code_idx on families(code);

-- Enable RLS
alter table families enable row level security;
alter table feedings enable row level security;

-- RLS policies (public access via anon key - auth is via family code)
create policy "Allow all on families" on families for all using (true) with check (true);
create policy "Allow all on feedings" on feedings for all using (true) with check (true);

-- Enable realtime for feedings
alter publication supabase_realtime add table feedings;
