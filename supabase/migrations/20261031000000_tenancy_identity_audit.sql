-- Migration 0001: tenancy, identity and audit
-- Task: R2-D1-1. Spec: docs/DATABASE.md sections 2.1 and 4, docs/AUTH_AND_TENANCY.md.
-- Tables: colleges, college_domains, college_settings, profiles, memberships, audit_logs.
-- Lock impact: none. This is the first migration and the database is empty.
-- Expected duration: under 1 second.
-- Compensating migration (only if ever needed, never edit this file after merge):
--   drop table audit_logs, memberships, profiles, college_settings, college_domains, colleges cascade;
--   then drop the functions created below.

-- ---------------------------------------------------------------------------
-- Shared trigger function
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- colleges: one row per tenant
-- ---------------------------------------------------------------------------
create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  short_name text,
  city text,
  state text,
  country text not null default 'IN',
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'draft',
  logo_path text,
  accent_hex text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colleges_slug_key unique (slug),
  constraint colleges_slug_format check (slug ~ '^[a-z0-9-]{3,40}$'),
  constraint colleges_slug_not_reserved check (
    slug <> all (array[
      'admin', 'api', 'app', 'auth', 'c', 'colleges', 'dev', 'docs', 'health', 'login',
      'logout', 'me', 'p', 'platform', 'ready', 'signin', 'signup', 'static', 'waitlist', 'www'
    ])
  ),
  constraint colleges_name_length check (char_length(name) between 1 and 120),
  constraint colleges_short_name_length check (short_name is null or char_length(short_name) <= 60),
  constraint colleges_country_format check (country ~ '^[A-Z]{2}$'),
  constraint colleges_status_valid check (status in ('draft', 'active', 'suspended', 'archived')),
  constraint colleges_accent_hex_format check (accent_hex is null or accent_hex ~ '^#[0-9A-Fa-f]{6}$')
);

create trigger colleges_set_updated_at
  before update on public.colleges
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- college_domains: a domain belongs to exactly one tenant
-- ---------------------------------------------------------------------------
create table public.college_domains (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete cascade,
  domain text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint college_domains_domain_key unique (domain),
  constraint college_domains_domain_format check (
    domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
  )
);

create index college_domains_college_id_idx on public.college_domains (college_id);

-- ---------------------------------------------------------------------------
-- college_settings: one row per college, created automatically with the college
-- ---------------------------------------------------------------------------
create table public.college_settings (
  college_id uuid primary key references public.colleges (id) on delete cascade,
  allowed_methods text[] not null default array['email_domain', 'invite_code', 'manual'],
  require_admin_approval boolean not null default true,
  min_level_to_post smallint not null default 1,
  network_visibility text not null default 'private',
  features jsonb not null default '{}'::jsonb,
  retention jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint college_settings_methods_valid check (
    cardinality(allowed_methods) >= 1
    and allowed_methods <@ array['email_domain', 'invite_code', 'manual', 'roster']
  ),
  constraint college_settings_min_level_range check (min_level_to_post between 0 and 3),
  constraint college_settings_network_visibility_valid check (
    network_visibility in ('private', 'read_shared', 'full_shared')
  ),
  constraint college_settings_features_object check (jsonb_typeof(features) = 'object'),
  constraint college_settings_retention_object check (jsonb_typeof(retention) = 'object')
);

create trigger college_settings_set_updated_at
  before update on public.college_settings
  for each row execute function public.set_updated_at();

create function public.create_default_college_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.college_settings (college_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.create_default_college_settings() from public, anon, authenticated;

create trigger colleges_create_default_settings
  after insert on public.colleges
  for each row execute function public.create_default_college_settings();

-- ---------------------------------------------------------------------------
-- profiles: one per Supabase Auth user (not tenant-scoped; visibility goes
-- through shared active membership)
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  handle text,
  headline text,
  bio text,
  avatar_path text,
  interests text[] not null default '{}',
  career_goal text,
  visibility text not null default 'college',
  portfolio_public boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_key unique (handle),
  constraint profiles_display_name_length check (
    char_length(display_name) between 1 and 80 and btrim(display_name) <> ''
  ),
  constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_headline_length check (headline is null or char_length(headline) <= 120),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 1000),
  constraint profiles_interests_count check (cardinality(interests) <= 20),
  constraint profiles_career_goal_length check (career_goal is null or char_length(career_goal) <= 200),
  constraint profiles_visibility_valid check (visibility in ('college', 'hidden'))
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- memberships: who belongs to which college, with role, status and trust level
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  role text not null default 'student',
  status text not null default 'pending',
  verification_level smallint not null default 0,
  verification_method text,
  program text,
  grad_year smallint,
  enrollment_hash text,
  enrollment_last4 text,
  joined_at timestamptz,
  status_reason text,
  status_changed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_user_college_key unique (user_id, college_id),
  constraint memberships_role_valid check (role in ('student', 'moderator', 'college_admin')),
  constraint memberships_status_valid check (status in ('pending', 'active', 'suspended', 'rejected', 'left')),
  constraint memberships_level_range check (verification_level between 0 and 3),
  constraint memberships_active_needs_level check (status <> 'active' or verification_level >= 1),
  constraint memberships_method_valid check (
    verification_method is null
    or verification_method in ('email_domain', 'invite_code', 'manual', 'roster')
  ),
  constraint memberships_program_length check (program is null or char_length(program) <= 120),
  constraint memberships_grad_year_range check (grad_year is null or grad_year between 2000 and 2100),
  constraint memberships_last4_format check (enrollment_last4 is null or enrollment_last4 ~ '^[A-Za-z0-9]{1,4}$'),
  constraint memberships_status_reason_length check (status_reason is null or char_length(status_reason) <= 500)
);

create index memberships_college_status_idx on public.memberships (college_id, status);
create index memberships_user_id_idx on public.memberships (user_id);

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- A college must never be left without an active admin (docs/DATABASE.md section 9).
create function public.prevent_last_admin_loss()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'college_admin' and old.status = 'active'
     and (tg_op = 'DELETE'
          or new.role <> 'college_admin'
          or new.status <> 'active'
          or new.college_id <> old.college_id) then
    -- Lock the college row so two admins cannot remove each other at the same time.
    perform 1 from public.colleges c where c.id = old.college_id for no key update;
    if not exists (
      select 1
      from public.memberships m
      where m.college_id = old.college_id
        and m.role = 'college_admin'
        and m.status = 'active'
        and m.id <> old.id
    ) then
      raise exception 'a college must keep at least one active admin'
        using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_last_admin_loss() from public, anon, authenticated;

create trigger memberships_keep_one_admin
  before update or delete on public.memberships
  for each row execute function public.prevent_last_admin_loss();

-- ---------------------------------------------------------------------------
-- audit_logs: append only
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  college_id uuid references public.colleges (id) on delete restrict,
  actor_id uuid,
  actor_role text not null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now(),
  constraint audit_logs_actor_role_length check (char_length(actor_role) between 1 and 40),
  constraint audit_logs_action_length check (char_length(action) between 1 and 100),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_college_created_idx on public.audit_logs (college_id, created_at desc, id desc);

create function public.audit_logs_block_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;

revoke all on function public.audit_logs_block_change() from public, anon, authenticated;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_block_change();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.audit_logs_block_change();

-- Keep the guards active even when a session sets session_replication_role = replica.
alter table public.audit_logs enable always trigger audit_logs_no_update_delete;
alter table public.audit_logs enable always trigger audit_logs_no_truncate;

-- The only way to add an audit row. Only the server (service role) may call it.
create function public.write_audit_log(
  p_college_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_request_id text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.audit_logs (
    college_id, actor_id, actor_role, action, target_type, target_id, metadata, request_id
  )
  values (
    p_college_id, p_actor_id, p_actor_role, p_action, p_target_type, p_target_id,
    coalesce(p_metadata, '{}'::jsonb), p_request_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.write_audit_log(uuid, uuid, text, text, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.write_audit_log(uuid, uuid, text, text, text, text, jsonb, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Helper functions used by the RLS policies.
-- SECURITY DEFINER so they can read memberships without recursing into its policies.
-- search_path is fixed to empty, so every name below is schema-qualified.
-- ---------------------------------------------------------------------------
create function public.auth_member_colleges(min_level int default 1)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.college_id
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
    and m.verification_level >= min_level;
$$;

create function public.is_college_admin(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = (select auth.uid())
      and m.college_id = cid
      and m.status = 'active'
      and m.role = 'college_admin'
  );
$$;

create function public.is_moderator_or_admin(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = (select auth.uid())
      and m.college_id = cid
      and m.status = 'active'
      and m.role in ('moderator', 'college_admin')
  );
$$;

-- True when the signed-in user and target_user are both active members of one college.
create function public.auth_shares_college_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships other on other.college_id = me.college_id
    where me.user_id = (select auth.uid())
      and me.status = 'active'
      and other.user_id = target_user
      and other.status = 'active'
  );
$$;

revoke all on function public.auth_member_colleges(int) from public, anon;
revoke all on function public.is_college_admin(uuid) from public, anon;
revoke all on function public.is_moderator_or_admin(uuid) from public, anon;
revoke all on function public.auth_shares_college_with(uuid) from public, anon;
grant execute on function public.auth_member_colleges(int) to authenticated, service_role;
grant execute on function public.is_college_admin(uuid) to authenticated, service_role;
grant execute on function public.is_moderator_or_admin(uuid) to authenticated, service_role;
grant execute on function public.auth_shares_college_with(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security: ON for every table
-- ---------------------------------------------------------------------------
alter table public.colleges enable row level security;
alter table public.college_domains enable row level security;
alter table public.college_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_logs enable row level security;

-- colleges: members read their own college. Only the server (service role) writes.
create policy colleges_select_members on public.colleges
  for select to authenticated
  using (id in (select public.auth_member_colleges(0)));

-- college_domains: members read. Only the server writes (a domain claim is a trust decision).
create policy college_domains_select_members on public.college_domains
  for select to authenticated
  using (college_id in (select public.auth_member_colleges(0)));

-- college_settings: members read. College admins update their own college only.
create policy college_settings_select_members on public.college_settings
  for select to authenticated
  using (college_id in (select public.auth_member_colleges(0)));

create policy college_settings_update_admin on public.college_settings
  for update to authenticated
  using (public.is_college_admin(college_id))
  with check (public.is_college_admin(college_id));

-- profiles: you see your own, and visible profiles of people who share an active college with you.
create policy profiles_select_self_or_college on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      visibility = 'college'
      and deleted_at is null
      and public.auth_shares_college_with(user_id)
    )
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- memberships: you see your own, college admins see their college. Nobody writes from the client:
-- role, status and level are changed only by the server (service role).
create policy memberships_select_self_or_admin on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_college_admin(college_id));

-- audit_logs: admins of the same college read. Nobody inserts, updates or deletes from the client.
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (college_id is not null and public.is_college_admin(college_id));

-- ---------------------------------------------------------------------------
-- Table privileges: start from nothing, grant only what is needed.
-- anon gets no access to any table. Public pages use the server or explicit public views later.
-- ---------------------------------------------------------------------------
revoke all on public.colleges from anon, authenticated;
revoke all on public.college_domains from anon, authenticated;
revoke all on public.college_settings from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.memberships from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated, service_role;

grant select on public.colleges to authenticated;
grant select on public.college_domains to authenticated;
grant select on public.college_settings to authenticated;
grant update (allowed_methods, require_admin_approval, min_level_to_post, network_visibility, features, retention)
  on public.college_settings to authenticated;
grant select on public.profiles to authenticated;
grant insert (user_id, display_name, handle, headline, bio, avatar_path, interests, career_goal, visibility, portfolio_public)
  on public.profiles to authenticated;
grant update (display_name, handle, headline, bio, avatar_path, interests, career_goal, visibility, portfolio_public)
  on public.profiles to authenticated;
grant select on public.memberships to authenticated;
grant select on public.audit_logs to authenticated, service_role;
