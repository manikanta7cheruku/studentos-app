-- Migration 20261141: phone and desktop push alerts.
-- A device that allows alerts is stored in push_subscriptions (closed table: only the server reads and writes it).
-- Every notification gets pushed_at, so each one is sent to the person's devices once.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_endpoint_https check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  constraint push_keys_length check (length(p256dh) <= 200 and length(auth) <= 100)
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
create policy push_subscriptions_no_client_access on public.push_subscriptions for select to authenticated using (false);

-- Notifications that exist now were already seen in the app: they are not pushed.
alter table public.notifications add column pushed_at timestamptz;
update public.notifications set pushed_at = now();
create index notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

-- Save (or move to this person) one device. A person keeps at most 5; the oldest go first.
create function public.push_subscribe(
  p_user uuid, p_endpoint text, p_p256dh text, p_auth text, p_agent text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at)
  values (p_user, p_endpoint, p_p256dh, p_auth, left(p_agent, 300), clock_timestamp())
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = clock_timestamp();
  delete from public.push_subscriptions s
  where s.user_id = p_user
    and s.id in (
      select id from public.push_subscriptions where user_id = p_user order by created_at desc offset 5
    );
end;
$$;

create function public.push_unsubscribe(p_user uuid, p_endpoint text) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_count int;
begin
  delete from public.push_subscriptions where user_id = p_user and endpoint = p_endpoint;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Take the notifications that still need a push (at most p_limit), mark them taken, and return one row per
-- device of the person. Notifications older than 2 hours are marked without sending: an old alert is noise.
-- Several workers can run at once: skip locked gives each its own batch.
create function public.push_claim(p_limit int default 50)
returns table (
  notification_id uuid, user_id uuid, type text, payload jsonb, college_slug text,
  sub_id uuid, endpoint text, p256dh text, auth text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications n set pushed_at = now()
  where n.pushed_at is null and n.created_at < now() - interval '2 hours';

  return query
  with taken as (
    update public.notifications n set pushed_at = now()
    where n.id in (
      select x.id from public.notifications x
      where x.pushed_at is null
      order by x.created_at
      limit greatest(1, least(p_limit, 200))
      for update skip locked
    )
    returning n.id, n.user_id, n.type, n.payload, n.college_id
  )
  select t.id, t.user_id, t.type, t.payload, c.slug::text, s.id, s.endpoint, s.p256dh, s.auth
  from taken t
  join public.push_subscriptions s on s.user_id = t.user_id
  left join public.colleges c on c.id = t.college_id;
end;
$$;

-- Forget devices the push service said are gone (a 404 or 410 answer).
create function public.push_drop(p_ids uuid[]) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_count int;
begin
  delete from public.push_subscriptions where id = any (p_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.push_subscribe(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.push_unsubscribe(uuid, text) from public, anon, authenticated;
revoke all on function public.push_claim(int) from public, anon, authenticated;
revoke all on function public.push_drop(uuid[]) from public, anon, authenticated;
grant execute on function public.push_subscribe(uuid, text, text, text, text) to service_role;
grant execute on function public.push_unsubscribe(uuid, text) to service_role;
grant execute on function public.push_claim(int) to service_role;
grant execute on function public.push_drop(uuid[]) to service_role;
