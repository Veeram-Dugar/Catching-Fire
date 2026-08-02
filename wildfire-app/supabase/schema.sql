-- Run this in the Supabase SQL editor before using the app.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  lat float8 not null,
  lng float8 not null,
  severity text not null check (severity in ('smoke', 'small_flame', 'large_fire')),
  created_at timestamptz default now()
);

alter table reports enable row level security;

-- Allow anyone (anonymous) to submit a report
create policy "Anyone can insert reports"
on reports for insert
to anon
with check (true);

-- Allow anyone (anonymous) to read reports
create policy "Anyone can read reports"
on reports for select
to anon
using (true);
