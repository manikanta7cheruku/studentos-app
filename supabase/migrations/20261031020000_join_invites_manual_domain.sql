-- Migration 0003: joining a college (invite code, college email, manual request)
-- Task: R2-D2-2. Spec: docs/DATABASE.md sections 2.1 and 9, docs/AUTH_AND_TENANCY.md section 3,
-- docs/API_CONTRACT.md TEN-01 to TEN-05.
-- Lock impact: none (new tables, functions and one view; one new partial unique index on a small table).
-- Expected duration: under 1 second.
-- Compensating migration (only if ever needed): drop the functions and the view below, then drop tables
-- idempotency_keys, verification_requests, invite_codes, and drop index memberships_enrollment_active_key.

-- ---------------------------------------------------------------------------
-- invite_codes: only a hash of the code is stored. The plain code is shown once, at creation.
-- ---------------------------------------------------------------------------
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  code_hash text not null,
  label text not null,
  created_by uuid,
  max_uses int not null,
  used_count int not null default 0,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  grants_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint invite_codes_code_hash_key unique (code_hash),
  constraint invite_codes_label_length check (char_length(label) between 1 and 80),
  constraint invite_codes_max_uses_range check (max_uses between 1 and 1000),
  constraint invite_codes_used_count_range check (used_count >= 0 and used_count <= max_uses),
  constraint invite_codes_grants_status_valid check (grants_status in ('active', 'pending'))
);

create index invite_codes_college_idx on public.invite_codes (college_id, created_at desc);

alter table public.invite_codes enable row level security;

create policy invite_codes_select_admin on public.invite_codes
  for select to authenticated
  using (public.is_college_admin(college_id));

revoke all on public.invite_codes from anon, authenticated;
-- Admins may read everything except the hash. Creating and revoking go through the server.
grant select (id, college_id, label, created_by, max_uses, used_count, expires_at, revoked_at, grants_status, created_at)
  on public.invite_codes to authenticated;

-- ---------------------------------------------------------------------------
-- verification_requests: one row for each manual join waiting for an admin
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  method text not null,
  status text not null default 'pending',
  submitted_data jsonb not null default '{}'::jsonb,
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint verification_requests_method_valid check (method in ('email_domain', 'invite_code', 'manual', 'roster')),
  constraint verification_requests_status_valid check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  constraint verification_requests_submitted_object check (jsonb_typeof(submitted_data) = 'object'),
  constraint verification_requests_reason_length check (decision_reason is null or char_length(decision_reason) <= 500)
);

create index verification_requests_queue_idx
  on public.verification_requests (college_id, status, created_at);
create unique index verification_requests_one_pending_key
  on public.verification_requests (membership_id) where status = 'pending';

alter table public.verification_requests enable row level security;

create policy verification_requests_select_owner_or_admin on public.verification_requests
  for select to authenticated
  using (
    public.is_college_admin(college_id)
    or exists (
      select 1 from public.memberships m
      where m.id = membership_id and m.user_id = (select auth.uid())
    )
  );

revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;

-- One enrolment number can be used by one pending or active member of a college.
create unique index memberships_enrollment_active_key
  on public.memberships (college_id, enrollment_hash)
  where enrollment_hash is not null and status in ('pending', 'active');

-- ---------------------------------------------------------------------------
-- idempotency_keys: a double click or a retry gives the first answer back (docs/ERROR_HANDLING.md section 3)
-- ---------------------------------------------------------------------------
create table public.idempotency_keys (
  key text not null,
  user_id uuid not null,
  route text not null,
  request_hash text not null,
  response jsonb not null,
  status_code int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (user_id, key, route),
  constraint idempotency_keys_key_length check (char_length(key) between 8 and 100)
);

alter table public.idempotency_keys enable row level security;

create policy idempotency_keys_no_client_access on public.idempotency_keys
  for all to authenticated
  using (false)
  with check (false);

revoke all on public.idempotency_keys from anon, authenticated;

create function public.idempotency_purge()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  delete from public.idempotency_keys where expires_at < now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.idempotency_purge() from public, anon, authenticated;
grant execute on function public.idempotency_purge() to service_role;

-- ---------------------------------------------------------------------------
-- public_college_branding: the only thing a visitor who is not signed in may read (TEN-01).
-- The view runs with its owner's rights, so it shows only these columns of active colleges.
-- ---------------------------------------------------------------------------
create view public.public_college_branding
with (security_invoker = false) as
select
  c.slug,
  c.name,
  c.short_name,
  c.city,
  c.state,
  c.accent_hex,
  s.allowed_methods,
  s.require_admin_approval
from public.colleges c
join public.college_settings s on s.college_id = c.id
where c.status = 'active';

revoke all on public.public_college_branding from public, anon, authenticated;
grant select on public.public_college_branding to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Join functions. Only the server (service role) may call them, after it has checked who the user is.
-- Each one runs as ONE transaction. A raised error undoes everything, including a used invite.
-- Errors are raised with the stable API code as the message (for example INVITE_EXPIRED).
-- ---------------------------------------------------------------------------

-- Common checks before any join. Returns the college id and the id of an old "left" membership (or null).
create function public.join_prepare(p_user uuid, p_slug text, p_method text)
returns table (college_id uuid, reusable_membership_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college record;
  v_membership record;
begin
  select c.id, c.status, s.allowed_methods into v_college
  from public.colleges c
  join public.college_settings s on s.college_id = c.id
  where c.slug = p_slug;

  if not found or v_college.status = 'draft' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_college.status in ('suspended', 'archived') then
    raise exception 'TENANT_SUSPENDED' using errcode = 'P0001';
  end if;
  if not (p_method = any (v_college.allowed_methods)) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select m.id, m.status into v_membership
  from public.memberships m
  where m.user_id = p_user and m.college_id = v_college.id
  for update;

  if found then
    if v_membership.status in ('active', 'pending') then
      raise exception 'CONFLICT' using errcode = 'P0001';
    elsif v_membership.status in ('suspended', 'rejected') then
      -- A person the college suspended or rejected cannot come back on their own.
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    return query select v_college.id, v_membership.id;
  else
    return query select v_college.id, null::uuid;
  end if;
end;
$$;

-- Create the membership, or bring an old "left" one back.
create function public.join_write_membership(
  p_user uuid,
  p_college uuid,
  p_reusable uuid,
  p_status text,
  p_level smallint,
  p_method text,
  p_program text default null,
  p_grad_year int default null,
  p_enrollment_hash text default null,
  p_enrollment_last4 text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_joined timestamptz := case when p_status = 'active' then now() else null end;
begin
  if p_reusable is not null then
    update public.memberships
    set role = 'student', status = p_status, verification_level = p_level, verification_method = p_method,
        program = p_program, grad_year = p_grad_year, enrollment_hash = p_enrollment_hash,
        enrollment_last4 = p_enrollment_last4, joined_at = v_joined, status_reason = null, status_changed_by = null
    where id = p_reusable
    returning id into v_id;
  else
    insert into public.memberships (
      user_id, college_id, role, status, verification_level, verification_method,
      program, grad_year, enrollment_hash, enrollment_last4, joined_at
    )
    values (
      p_user, p_college, 'student', p_status, p_level, p_method,
      p_program, p_grad_year, p_enrollment_hash, p_enrollment_last4, v_joined
    )
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- TEN-03. The invite use is ONE update statement: two people can never both take the last use.
create function public.redeem_invite(p_user uuid, p_slug text, p_code_hash text, p_request_id text default null)
returns table (membership_id uuid, status text, verification_level smallint, verification_method text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college uuid;
  v_reusable uuid;
  v_invite record;
  v_status text;
  v_level smallint;
  v_membership uuid;
begin
  begin
    select p.college_id, p.reusable_membership_id into v_college, v_reusable
    from public.join_prepare(p_user, p_slug, 'invite_code') p;
  exception when others then
    -- A college that does not take invite codes must not reveal that it exists. Same answer as a wrong code.
    if sqlerrm = 'FORBIDDEN' and not exists (
      select 1 from public.memberships m join public.colleges c on c.id = m.college_id
      where m.user_id = p_user and c.slug = p_slug and m.status in ('suspended', 'rejected')
    ) then
      raise exception 'INVITE_INVALID' using errcode = 'P0001';
    end if;
    raise;
  end;

  update public.invite_codes i
  set used_count = i.used_count + 1
  where i.college_id = v_college
    and i.code_hash = p_code_hash
    and i.revoked_at is null
    and i.expires_at > now()
    and i.used_count < i.max_uses
  returning i.id, i.grants_status into v_invite;

  if not found then
    select i.revoked_at, i.expires_at, i.used_count, i.max_uses into v_invite
    from public.invite_codes i
    where i.college_id = v_college and i.code_hash = p_code_hash;
    if not found or v_invite.revoked_at is not null then
      raise exception 'INVITE_INVALID' using errcode = 'P0001';
    elsif v_invite.expires_at <= now() then
      raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
    else
      raise exception 'INVITE_EXHAUSTED' using errcode = 'P0001';
    end if;
  end if;

  v_status := v_invite.grants_status;
  v_level := case when v_status = 'active' then 2 else 1 end;
  v_membership := public.join_write_membership(p_user, v_college, v_reusable, v_status, v_level, 'invite_code');

  if v_status = 'pending' then
    insert into public.verification_requests (membership_id, college_id, method, status, submitted_data, expires_at)
    values (v_membership, v_college, 'invite_code', 'pending', jsonb_build_object('invite_id', v_invite.id), now() + interval '30 days');
  end if;

  perform public.write_audit_log(
    v_college, p_user, 'student', 'member.joined', 'membership', v_membership::text,
    jsonb_build_object('method', 'invite_code', 'status', v_status, 'invite_id', v_invite.id), p_request_id
  );

  return query select v_membership, v_status, v_level, 'invite_code'::text;
end;
$$;

-- TEN-04. The enrolment number arrives already hashed. Only the hash and the last 4 characters are kept.
create function public.submit_manual_join(
  p_user uuid,
  p_slug text,
  p_enrollment_hash text,
  p_enrollment_last4 text,
  p_program text,
  p_grad_year int,
  p_request_id text default null
)
returns table (membership_id uuid, status text, verification_level smallint, verification_method text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college uuid;
  v_reusable uuid;
  v_membership uuid;
begin
  select p.college_id, p.reusable_membership_id into v_college, v_reusable
  from public.join_prepare(p_user, p_slug, 'manual') p;

  begin
    v_membership := public.join_write_membership(
      p_user, v_college, v_reusable, 'pending', 1::smallint, 'manual',
      p_program, p_grad_year, p_enrollment_hash, p_enrollment_last4
    );
  exception when unique_violation then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end;

  insert into public.verification_requests (membership_id, college_id, method, status, submitted_data, expires_at)
  values (
    v_membership, v_college, 'manual', 'pending',
    jsonb_build_object('program', p_program, 'grad_year', p_grad_year, 'enrollment_last4', p_enrollment_last4),
    now() + interval '30 days'
  );

  perform public.write_audit_log(
    v_college, p_user, 'student', 'member.join_requested', 'membership', v_membership::text,
    jsonb_build_object('method', 'manual', 'program', p_program, 'grad_year', p_grad_year), p_request_id
  );

  return query select v_membership, 'pending'::text, 1::smallint, 'manual'::text;
end;
$$;

-- TEN-05, first step: may this college email address be used? Checks the domain and the method.
create function public.email_domain_allowed(p_slug text, p_domain text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.colleges c
    join public.college_settings s on s.college_id = c.id
    join public.college_domains d on d.college_id = c.id
    where c.slug = p_slug
      and c.status = 'active'
      and 'email_domain' = any (s.allowed_methods)
      and d.domain = lower(p_domain)
      and d.verified_at is not null
  );
$$;

-- TEN-05, last step. The server has already proven that the person controls an address on p_domain.
create function public.complete_email_domain_join(p_user uuid, p_slug text, p_domain text, p_request_id text default null)
returns table (membership_id uuid, status text, verification_level smallint, verification_method text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college uuid;
  v_reusable uuid;
  v_membership uuid;
begin
  select p.college_id, p.reusable_membership_id into v_college, v_reusable
  from public.join_prepare(p_user, p_slug, 'email_domain') p;

  if not exists (
    select 1 from public.college_domains d
    where d.college_id = v_college and d.domain = lower(p_domain) and d.verified_at is not null
  ) then
    raise exception 'DOMAIN_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  v_membership := public.join_write_membership(p_user, v_college, v_reusable, 'active', 2::smallint, 'email_domain');

  perform public.write_audit_log(
    v_college, p_user, 'student', 'member.joined', 'membership', v_membership::text,
    jsonb_build_object('method', 'email_domain', 'domain', lower(p_domain), 'status', 'active'), p_request_id
  );

  return query select v_membership, 'active'::text, 2::smallint, 'email_domain'::text;
end;
$$;

revoke all on function public.join_prepare(uuid, text, text) from public, anon, authenticated;
revoke all on function public.join_write_membership(uuid, uuid, uuid, text, smallint, text, text, int, text, text)
  from public, anon, authenticated;
revoke all on function public.redeem_invite(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.submit_manual_join(uuid, text, text, text, text, int, text) from public, anon, authenticated;
revoke all on function public.email_domain_allowed(text, text) from public, anon, authenticated;
revoke all on function public.complete_email_domain_join(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.join_prepare(uuid, text, text) to service_role;
grant execute on function public.redeem_invite(uuid, text, text, text) to service_role;
grant execute on function public.submit_manual_join(uuid, text, text, text, text, int, text) to service_role;
grant execute on function public.email_domain_allowed(text, text) to service_role;
grant execute on function public.complete_email_domain_join(uuid, text, text, text) to service_role;
-- join_write_membership is an internal helper: no one outside these functions calls it.
