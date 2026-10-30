-- Migration 0002: rate limits and "my membership for this college"
-- Task: R2-D2-1. Spec: docs/API_CONTRACT.md section 1 (rate limits), docs/ERROR_HANDLING.md F18 and F27.
-- Lock impact: none (new table and functions). Expected duration: under 1 second.
-- Compensating migration (only if ever needed): drop the functions below, then drop table rate_limit_events.

-- ---------------------------------------------------------------------------
-- rate_limit_events: one row per counted event (a code request, a failed code).
-- key_hash is an HMAC made by the server, never a plain email or IP address.
-- Clients have no access. Only the service role calls the functions below.
-- ---------------------------------------------------------------------------
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  constraint rate_limit_events_bucket_length check (char_length(bucket) between 1 and 60),
  constraint rate_limit_events_key_hash_length check (char_length(key_hash) between 16 and 128)
);

create index rate_limit_events_lookup_idx
  on public.rate_limit_events (bucket, key_hash, created_at desc);

alter table public.rate_limit_events enable row level security;

-- Explicit deny: no client can read or write this table.
create policy rate_limit_events_no_client_access on public.rate_limit_events
  for all to authenticated
  using (false)
  with check (false);

revoke all on public.rate_limit_events from anon, authenticated;

-- Count an event if the caller is under the limit. Returns 0 when allowed and counted,
-- or the number of seconds to wait when the limit is reached (the event is then not counted).
create function public.rate_limit_consume(
  p_bucket text,
  p_key_hash text,
  p_limit int,
  p_window_seconds int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_oldest timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'limit and window must be positive' using errcode = '22023';
  end if;
  -- One caller at a time per bucket and key, so two requests cannot both take the last slot.
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key_hash, 0));

  select count(*), min(created_at) into v_count, v_oldest
  from public.rate_limit_events
  where bucket = p_bucket
    and key_hash = p_key_hash
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::int);
  end if;

  insert into public.rate_limit_events (bucket, key_hash) values (p_bucket, p_key_hash);
  return 0;
end;
$$;

-- Look without counting. Returns 0 when under the limit, or the seconds to wait.
create function public.rate_limit_peek(
  p_bucket text,
  p_key_hash text,
  p_limit int,
  p_window_seconds int
)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_oldest timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'limit and window must be positive' using errcode = '22023';
  end if;
  select count(*), min(created_at) into v_count, v_oldest
  from public.rate_limit_events
  where bucket = p_bucket
    and key_hash = p_key_hash
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::int);
  end if;
  return 0;
end;
$$;

create function public.rate_limit_record(p_bucket text, p_key_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.rate_limit_events (bucket, key_hash) values (p_bucket, p_key_hash);
$$;

create function public.rate_limit_clear(p_bucket text, p_key_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limit_events where bucket = p_bucket and key_hash = p_key_hash;
$$;

-- When did this key last do something? Used to tell an expired code from a wrong one.
create function public.rate_limit_last(p_bucket text, p_key_hash text)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(created_at) from public.rate_limit_events where bucket = p_bucket and key_hash = p_key_hash;
$$;

-- Housekeeping, to be run by a scheduled job (set up by R5 later). Keeps one day of events.
create function public.rate_limit_purge()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  delete from public.rate_limit_events where created_at < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.rate_limit_consume(text, text, int, int) from public, anon, authenticated;
revoke all on function public.rate_limit_peek(text, text, int, int) from public, anon, authenticated;
revoke all on function public.rate_limit_record(text, text) from public, anon, authenticated;
revoke all on function public.rate_limit_clear(text, text) from public, anon, authenticated;
revoke all on function public.rate_limit_last(text, text) from public, anon, authenticated;
revoke all on function public.rate_limit_purge() from public, anon, authenticated;
grant execute on function public.rate_limit_consume(text, text, int, int) to service_role;
grant execute on function public.rate_limit_peek(text, text, int, int) to service_role;
grant execute on function public.rate_limit_record(text, text) to service_role;
grant execute on function public.rate_limit_clear(text, text) to service_role;
grant execute on function public.rate_limit_last(text, text) to service_role;
grant execute on function public.rate_limit_purge() to service_role;

-- ---------------------------------------------------------------------------
-- my_membership_for_slug: the signed-in user's own membership in one college.
-- Lets the API decide between "not found", "pending", "suspended" and "ok" without
-- using the service role. It returns only the caller's own row. Pending and suspended
-- users get their row too (they cannot read colleges directly, by design).
-- ---------------------------------------------------------------------------
create function public.my_membership_for_slug(p_slug text)
returns table (
  membership_id uuid,
  college_id uuid,
  college_slug text,
  college_status text,
  role text,
  status text,
  verification_level smallint,
  verification_method text,
  program text,
  grad_year smallint,
  joined_at timestamptz,
  status_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id, m.college_id, c.slug, c.status, m.role, m.status, m.verification_level,
    m.verification_method, m.program, m.grad_year, m.joined_at, m.status_reason
  from public.memberships m
  join public.colleges c on c.id = m.college_id
  where m.user_id = (select auth.uid())
    and c.slug = p_slug;
$$;

revoke all on function public.my_membership_for_slug(text) from public, anon;
grant execute on function public.my_membership_for_slug(text) to authenticated, service_role;
