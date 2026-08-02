-- Run this in the Supabase SQL editor. Every statement here is idempotent
-- (IF NOT EXISTS / CREATE OR REPLACE / DROP-then-CREATE for policies), so
-- it's always safe to re-run the whole file after an update -- re-running
-- it against an already-set-up project just applies whatever's new.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  lat float8 not null,
  lng float8 not null,
  severity text not null check (severity in ('smoke', 'small_flame', 'large_fire')),
  created_at timestamptz default now(),
  delete_token uuid not null default gen_random_uuid()
);

-- For projects that already had the table before delete_token existed.
alter table reports add column if not exists delete_token uuid not null default gen_random_uuid();

alter table reports enable row level security;

-- Reports are fully anonymous (no accounts), so nobody can be trusted to
-- insert/delete arbitrary rows directly -- that's exactly the "bad actor
-- deletes real fire reports" problem this app is designed to avoid. Direct
-- table insert/delete is revoked entirely; the only way in or out is
-- through the two SECURITY DEFINER functions below, which control
-- precisely what's possible and what's exposed.
revoke insert, delete on reports from anon;
drop policy if exists "Anyone can insert reports" on reports;

-- Anyone can still read reports directly -- but only the safe columns.
-- delete_token is deliberately excluded here: it's a per-report secret,
-- only ever handed back to whoever just submitted that specific report
-- (via insert_report below), never exposed through any read path. Since
-- report ids ARE public (returned here), hiding the token is what stops
-- someone from harvesting ids off the map and deleting others' reports.
drop policy if exists "Anyone can read reports" on reports;
create policy "Anyone can read reports"
on reports for select
to anon
using (true);

revoke select on reports from anon;
grant select (id, lat, lng, severity, created_at) on reports to anon;

-- Insert goes through this function (not a raw table insert) so it can
-- return delete_token to the caller despite anon's column grant excluding
-- it everywhere else -- SECURITY DEFINER runs with the function owner's
-- privileges, not the caller's, so the column restriction above doesn't
-- apply to what the function itself can read/return.
create or replace function insert_report(p_lat float8, p_lng float8, p_severity text)
returns table (id uuid, delete_token uuid)
language sql
security definer
set search_path = public
as $$
  insert into reports (lat, lng, severity)
  values (p_lat, p_lng, p_severity)
  returning reports.id, reports.delete_token;
$$;

grant execute on function insert_report(float8, float8, text) to anon;

-- Deletes a report by presenting the exact token you were given at
-- submission time. Returns true if a row was actually deleted. Requiring
-- the token as a function argument (rather than a client-controlled WHERE
-- filter under a permissive RLS policy) means there's no way to delete a
-- report without actually knowing its token -- a caller can't just omit
-- it the way they could bypass a plain "USING (true)" delete policy.
create or replace function delete_report(p_id uuid, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  delete from reports where id = p_id and delete_token = p_token;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

grant execute on function delete_report(uuid, uuid) to anon;
