-- Migration: daily_focus table
-- Created: 2026-02-25
-- Feature: Big 3 Focus productivity tracker

create table if not exists daily_focus (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'arno',
  date date not null default current_date,
  task_1 text,
  task_1_done boolean default false,
  task_2 text,
  task_2_done boolean default false,
  task_3 text,
  task_3_done boolean default false,
  reflection text,
  energy_level int check (energy_level between 1 and 5),
  focus_score int check (focus_score between 1 and 5),
  pomodoros_completed int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Trigger to auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists daily_focus_updated_at on daily_focus;
create trigger daily_focus_updated_at
  before update on daily_focus
  for each row
  execute function update_updated_at_column();

-- Enable Row Level Security
alter table daily_focus enable row level security;

-- Policy: allow all for now (single-user dashboard)
create policy "Allow all operations" on daily_focus
  for all
  using (true)
  with check (true);
