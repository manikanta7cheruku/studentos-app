-- Migration: the owner (platform admin) dashboard (R3-D13, decision D-34).
-- The owner of StudentOS sees all colleges, makes and revokes setup codes, looks up users and reads the platform's own
-- audit trail. Access needs three things, all checked on the server: a signed-in account that is on the allow-list
-- (`platform_admins`), the owner PIN (stored only as a salted hash), and a short unlock after the PIN.
-- Same rule as the earlier tables: RLS is on, the only policies say "no", and only the server (service role) reaches the
-- data through the functions below. Nothing here is reachable from the browser.

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pin_hash text not null,
  pin_set_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint platform_admins_pin_hash_format check (pin_hash like 'scrypt$%')
);
alter table public.platform_admins enable row level security;
create policy platform_admins_no_client_access on public.platform_admins for select to authenticated using (false);
revoke all on public.platform_admins from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------------
create function public.owner_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'colleges_total', (select count(*) from public.colleges c where c.slug <> 'global'),
    'colleges_active', (select count(*) from public.colleges c where c.slug <> 'global' and c.status = 'active'),
    'colleges_suspended', (select count(*) from public.colleges c where c.status = 'suspended'),
    'users_total', (select count(*) from auth.users),
    'users_active_7d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '7 days'),
    'signups_7d', (select count(*) from auth.users u where u.created_at > now() - interval '7 days'),
    'signups_30d', (select count(*) from auth.users u where u.created_at > now() - interval '30 days'),
    'memberships_active', (select count(*) from public.memberships m where m.status = 'active'),
    'memberships_pending', (select count(*) from public.memberships m where m.status = 'pending'),
    'plans', (select count(*) from public.team_posts t where t.status <> 'removed'),
    'ideas', (select count(*) from public.ideas i where i.status = 'published'),
    'events', (select count(*) from public.events e where e.status = 'published'),
    'listings', (select count(*) from public.board_posts b where b.status <> 'removed'),
    'reports_open', (select count(*) from public.reports r where r.status = 'open'),
    'codes_open', (select count(*) from public.college_setup_codes k where k.used_at is null and k.expires_at > now())
  );
$$;

-- Sign-ups per day for the last p_days days (days with none are 0).
create function public.owner_signups(p_days int)
returns table (day date, n int)
language sql
stable
security definer
set search_path = ''
as $$
  select d::date as day,
         (select count(*)::int from auth.users u where u.created_at::date = d::date) as n
  from generate_series(current_date - (least(greatest(p_days, 1), 180) - 1), current_date, interval '1 day') d
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Colleges
-- ---------------------------------------------------------------------------
create function public.owner_colleges()
returns table (
  id uuid, slug text, name text, short_name text, city text, state text, status text, created_at timestamptz,
  members int, pending int, admins jsonb, domains text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.slug, c.name, c.short_name, c.city, c.state, c.status, c.created_at,
    (select count(*)::int from public.memberships m where m.college_id = c.id and m.status = 'active'),
    (select count(*)::int from public.memberships m where m.college_id = c.id and m.status = 'pending'),
    coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(p.display_name, ''), 'email', u.email))
      from public.memberships m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.user_id = m.user_id
      where m.college_id = c.id and m.role = 'college_admin' and m.status = 'active'
    ), '[]'::jsonb),
    coalesce((select array_agg(d.domain order by d.domain) from public.college_domains d where d.college_id = c.id), array[]::text[])
  from public.colleges c
  order by c.created_at desc;
$$;

create function public.owner_college_set_status(p_actor uuid, p_college uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college public.colleges;
begin
  if p_status not in ('active', 'suspended') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_college from public.colleges c where c.id = p_college;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  update public.colleges set status = p_status where id = p_college;
  perform public.write_audit_log(p_college, p_actor, 'platform_owner',
    case when p_status = 'suspended' then 'owner.college_suspended' else 'owner.college_reactivated' end,
    'college', p_college::text, jsonb_build_object('slug', v_college.slug, 'from', v_college.status, 'to', p_status), null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Setup codes
-- ---------------------------------------------------------------------------
create function public.owner_codes()
returns table (
  id uuid, label text, created_at timestamptz, expires_at timestamptz, used_at timestamptz,
  used_by_email text, college_slug text, state text
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.label, k.created_at, k.expires_at, k.used_at, u.email::text, c.slug,
    case when k.used_at is not null then 'used' when k.expires_at <= now() then 'expired' else 'active' end
  from public.college_setup_codes k
  left join auth.users u on u.id = k.used_by
  left join public.colleges c on c.id = k.college_id
  order by k.created_at desc
  limit 200;
$$;

-- Makes a code and writes it to the audit trail (the code itself is never logged).
create function public.owner_code_make(p_actor uuid, p_label text, p_days int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  v_code := public.make_college_setup_code(p_label, p_days);
  perform public.write_audit_log(null, p_actor, 'platform_owner', 'owner.code_made', 'setup_code', null,
    jsonb_build_object('label', coalesce(btrim(p_label), ''), 'days', p_days), null);
  return v_code;
end;
$$;

-- A code that has not been used is ended now. A used or already ended code is not found.
create function public.owner_code_revoke(p_actor uuid, p_code uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
begin
  update public.college_setup_codes
     set expires_at = now()
   where id = p_code and used_at is null and expires_at > now()
  returning label into v_label;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform public.write_audit_log(null, p_actor, 'platform_owner', 'owner.code_revoked', 'setup_code', p_code::text,
    jsonb_build_object('label', v_label), null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create function public.owner_users(p_q text, p_limit int)
returns table (
  id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz,
  banned_until timestamptz, suspended boolean, spaces jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_like text;
begin
  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
    select u.id, u.email::text, coalesce(p.display_name, ''), u.created_at, u.last_sign_in_at, u.banned_until,
      (u.banned_until is not null and u.banned_until > now()),
      coalesce((
        select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'role', m.role, 'status', m.status) order by c.name)
        from public.memberships m join public.colleges c on c.id = m.college_id
        where m.user_id = u.id
      ), '[]'::jsonb)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where v_q is null or u.email ilike v_like or p.display_name ilike v_like
    order by u.created_at desc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

create function public.owner_user_audit(p_actor uuid, p_target uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.write_audit_log(null, p_actor, 'platform_owner', p_action, 'user', p_target::text, '{}'::jsonb, null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reports from every college, health and the owner's own audit trail
-- ---------------------------------------------------------------------------
create function public.owner_reports(p_limit int)
returns table (
  id uuid, college_slug text, college_name text, target_type text, reason text, details text,
  reporter_email text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, c.slug, c.name, r.target_type, r.reason, r.details, u.email::text, r.created_at
  from public.reports r
  join public.colleges c on c.id = r.college_id
  left join auth.users u on u.id = r.reporter_id
  where r.status = 'open'
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

create function public.owner_health()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'rate_limit_blocks_24h', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', x.bucket, 'n', x.n) order by x.n desc)
      from (
        select e.bucket, count(*)::int as n
        from public.rate_limit_events e
        where e.created_at > now() - interval '24 hours'
        group by e.bucket
        order by count(*) desc
        limit 12
      ) x
    ), '[]'::jsonb),
    'audit_24h', (select count(*) from public.audit_logs a where a.created_at > now() - interval '24 hours'),
    'oldest_pending_membership', (select min(m.created_at) from public.memberships m where m.status = 'pending'),
    'tables', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'plans', (select count(*) from public.team_posts),
      'ideas', (select count(*) from public.ideas),
      'events', (select count(*) from public.events),
      'board_posts', (select count(*) from public.board_posts),
      'board_messages', (select count(*) from public.board_messages),
      'notifications', (select count(*) from public.notifications)
    )
  );
$$;

create function public.owner_audit(p_limit int)
returns table (
  id bigint, created_at timestamptz, actor_email text, action text, target_type text, target_id text,
  college_slug text, metadata jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.created_at, u.email::text, a.action, a.target_type, a.target_id, c.slug, a.metadata
  from public.audit_logs a
  left join auth.users u on u.id = a.actor_id
  left join public.colleges c on c.id = a.college_id
  where a.actor_role = 'platform_owner'
  order by a.created_at desc, a.id desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke all on function public.owner_overview() from public, anon, authenticated;
revoke all on function public.owner_signups(int) from public, anon, authenticated;
revoke all on function public.owner_colleges() from public, anon, authenticated;
revoke all on function public.owner_college_set_status(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.owner_codes() from public, anon, authenticated;
revoke all on function public.owner_code_make(uuid, text, int) from public, anon, authenticated;
revoke all on function public.owner_code_revoke(uuid, uuid) from public, anon, authenticated;
revoke all on function public.owner_users(text, int) from public, anon, authenticated;
revoke all on function public.owner_user_audit(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.owner_reports(int) from public, anon, authenticated;
revoke all on function public.owner_health() from public, anon, authenticated;
revoke all on function public.owner_audit(int) from public, anon, authenticated;
grant execute on function public.owner_overview() to service_role;
grant execute on function public.owner_signups(int) to service_role;
grant execute on function public.owner_colleges() to service_role;
grant execute on function public.owner_college_set_status(uuid, uuid, text) to service_role;
grant execute on function public.owner_codes() to service_role;
grant execute on function public.owner_code_make(uuid, text, int) to service_role;
grant execute on function public.owner_code_revoke(uuid, uuid) to service_role;
grant execute on function public.owner_users(text, int) to service_role;
grant execute on function public.owner_user_audit(uuid, uuid, text) to service_role;
grant execute on function public.owner_reports(int) to service_role;
grant execute on function public.owner_health() to service_role;
grant execute on function public.owner_audit(int) to service_role;
