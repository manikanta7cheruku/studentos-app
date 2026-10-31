-- Migration 0004: college admin functions (settings, invites, verification queue, members, audit read, stats)
-- Task: R2-D3-1. Spec: docs/API_CONTRACT.md ADM-03, ADM-05 to ADM-11, docs/AUTH_AND_TENANCY.md sections 4 and 8,
-- docs/FEATURES_AND_JOURNEYS.md F-05/F-06.
-- Lock impact: none (new functions only). Expected duration: under 1 second.
-- Compensating migration (only if ever needed): drop the functions created below.
--
-- Rules for every function here:
--   * Only the server (service role) may call it, after it has checked who the user is.
--   * The function checks AGAIN that the actor is an active admin of that college (admin_assert).
--     So a mistake in the TypeScript guard can never become a permission hole.
--   * Every function that changes something writes exactly ONE audit row, in the same transaction.
--   * Errors are raised with the stable API code as the message (for example CONFLICT).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.admin_assert(p_actor uuid, p_college uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor is null or not exists (
    select 1 from public.memberships m
    where m.user_id = p_actor and m.college_id = p_college
      and m.status = 'active' and m.role = 'college_admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.colleges c where c.id = p_college and c.status in ('suspended', 'archived')) then
    raise exception 'TENANT_SUSPENDED' using errcode = 'P0001';
  end if;
end;
$$;

create function public.admin_invite_json(i public.invite_codes)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'label', i.label,
    'max_uses', i.max_uses,
    'used_count', i.used_count,
    'expires_at', i.expires_at,
    'revoked_at', i.revoked_at,
    'grants_status', i.grants_status,
    'status', case
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      when i.used_count >= i.max_uses then 'exhausted'
      else 'active'
    end,
    'created_by', i.created_by,
    'created_at', i.created_at
  );
$$;

create function public.admin_settings_json(p_college uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'allowed_methods', to_jsonb(s.allowed_methods),
    'require_admin_approval', s.require_admin_approval,
    'min_level_to_post', s.min_level_to_post,
    'network_visibility', s.network_visibility,
    'features', s.features,
    'retention', s.retention,
    'college', jsonb_build_object(
      'name', c.name,
      'short_name', c.short_name,
      'accent_hex', c.accent_hex,
      'status', c.status,
      'domains', coalesce((
        select jsonb_agg(jsonb_build_object('domain', d.domain, 'verified', d.verified_at is not null) order by d.domain)
        from public.college_domains d where d.college_id = c.id
      ), '[]'::jsonb)
    )
  )
  from public.college_settings s
  join public.colleges c on c.id = s.college_id
  where s.college_id = p_college;
$$;

create function public.admin_member_json(p_membership uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'membership_id', m.id,
    'user_id', m.user_id,
    'display_name', coalesce(p.display_name, 'Unknown'),
    'role', m.role,
    'status', m.status,
    'verification_level', m.verification_level,
    'verification_method', m.verification_method,
    'program', m.program,
    'grad_year', m.grad_year,
    'joined_at', m.joined_at
  )
  from public.memberships m
  left join public.profiles p on p.user_id = m.user_id
  where m.id = p_membership;
$$;

-- ---------------------------------------------------------------------------
-- ADM-03 settings
-- ---------------------------------------------------------------------------
create function public.admin_get_settings(p_actor uuid, p_college uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert(p_actor, p_college);
  return public.admin_settings_json(p_college);
end;
$$;

-- p_patch holds only the keys to change. The checks of the table (methods, levels, JSON objects) apply.
create function public.admin_update_settings(p_actor uuid, p_college uuid, p_patch jsonb, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert(p_actor, p_college);
  if jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  update public.college_settings s
  set allowed_methods = case when p_patch ? 'allowed_methods'
        then array(select jsonb_array_elements_text(p_patch -> 'allowed_methods')) else s.allowed_methods end,
      require_admin_approval = case when p_patch ? 'require_admin_approval'
        then (p_patch ->> 'require_admin_approval')::boolean else s.require_admin_approval end,
      min_level_to_post = case when p_patch ? 'min_level_to_post'
        then (p_patch ->> 'min_level_to_post')::smallint else s.min_level_to_post end,
      network_visibility = case when p_patch ? 'network_visibility'
        then p_patch ->> 'network_visibility' else s.network_visibility end,
      features = case when p_patch ? 'features' then p_patch -> 'features' else s.features end,
      retention = case when p_patch ? 'retention' then p_patch -> 'retention' else s.retention end
  where s.college_id = p_college;

  perform public.write_audit_log(
    p_college, p_actor, 'college_admin', 'settings.updated', 'college_settings', p_college::text,
    jsonb_build_object('changed', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(p_patch) k)),
    p_request_id
  );
  return public.admin_settings_json(p_college);
end;
$$;

-- ---------------------------------------------------------------------------
-- ADM-05 invites (the list is read with the admin's own login and Row Level Security, not here)
-- ---------------------------------------------------------------------------
create function public.admin_create_invite(
  p_actor uuid,
  p_college uuid,
  p_code_hash text,
  p_label text,
  p_max_uses int,
  p_expires_at timestamptz,
  p_grants_status text,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.invite_codes;
begin
  perform public.admin_assert(p_actor, p_college);
  if p_expires_at <= now() then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  insert into public.invite_codes (college_id, code_hash, label, created_by, max_uses, expires_at, grants_status)
  values (p_college, p_code_hash, p_label, p_actor, p_max_uses, p_expires_at, p_grants_status)
  returning * into v_invite;

  perform public.write_audit_log(
    p_college, p_actor, 'college_admin', 'invite.created', 'invite', v_invite.id::text,
    jsonb_build_object('label', p_label, 'max_uses', p_max_uses, 'expires_at', p_expires_at, 'grants_status', p_grants_status),
    p_request_id
  );
  return public.admin_invite_json(v_invite);
end;
$$;

create function public.admin_list_invites(p_actor uuid, p_college uuid, p_limit int default 100)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert(p_actor, p_college);
  return query
    select public.admin_invite_json(i)
    from public.invite_codes i
    where i.college_id = p_college
    order by i.created_at desc, i.id desc
    limit least(greatest(p_limit, 1), 200);
end;
$$;

create function public.admin_revoke_invite(p_actor uuid, p_college uuid, p_invite uuid, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.invite_codes;
begin
  perform public.admin_assert(p_actor, p_college);
  select * into v_invite from public.invite_codes i where i.id = p_invite and i.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.invite_codes set revoked_at = now() where id = v_invite.id returning * into v_invite;

  perform public.write_audit_log(
    p_college, p_actor, 'college_admin', 'invite.revoked', 'invite', v_invite.id::text,
    jsonb_build_object('label', v_invite.label, 'used_count', v_invite.used_count), p_request_id
  );
  return public.admin_invite_json(v_invite);
end;
$$;

-- ---------------------------------------------------------------------------
-- ADM-06 verification queue and ADM-07 decision
-- ---------------------------------------------------------------------------
create function public.admin_list_verification_requests(
  p_actor uuid,
  p_college uuid,
  p_status text,
  p_limit int,
  p_after_created timestamptz default null,
  p_after_id uuid default null
)
returns table (
  id uuid, membership_id uuid, method text, status text,
  user_id uuid, display_name text, email text,
  program text, grad_year smallint, enrollment_last4 text,
  created_at timestamptz, expires_at timestamptz,
  decided_by uuid, decided_at timestamptz, decision_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert(p_actor, p_college);
  return query
    select r.id, r.membership_id, r.method, r.status,
           m.user_id, coalesce(p.display_name, 'Unknown'), u.email::text,
           m.program, m.grad_year, m.enrollment_last4,
           r.created_at, r.expires_at, r.decided_by, r.decided_at, r.decision_reason
    from public.verification_requests r
    join public.memberships m on m.id = r.membership_id
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where r.college_id = p_college
      and (p_status is null or r.status = p_status)
      and (p_after_created is null or (r.created_at, r.id) < (p_after_created, p_after_id))
    order by r.created_at desc, r.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create function public.admin_decide_verification(
  p_actor uuid,
  p_college uuid,
  p_request uuid,
  p_decision text,
  p_reason text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.verification_requests;
  v_member public.memberships;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.admin_assert(p_actor, p_college);
  if p_decision not in ('approved', 'rejected') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_decision = 'rejected' and (v_reason is null or char_length(v_reason) < 5) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  select * into v_req from public.verification_requests r
  where r.id = p_request and r.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  -- Already decided, expired or cancelled: the item on the admin's screen is out of date.
  if v_req.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  select * into v_member from public.memberships m where m.id = v_req.membership_id for update;
  -- An admin can never decide their own request.
  if v_member.user_id = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_decision = 'approved' then
    update public.memberships
    set status = 'active', verification_level = 2, joined_at = coalesce(joined_at, now()),
        status_reason = null, status_changed_by = p_actor
    where id = v_member.id returning * into v_member;
  else
    update public.memberships
    set status = 'rejected', status_reason = v_reason, status_changed_by = p_actor
    where id = v_member.id returning * into v_member;
  end if;

  update public.verification_requests
  set status = p_decision, decided_by = p_actor, decided_at = now(), decision_reason = v_reason
  where id = v_req.id returning * into v_req;

  perform public.write_audit_log(
    p_college, p_actor, 'college_admin',
    case p_decision when 'approved' then 'member.approved' else 'member.rejected' end,
    'verification_request', v_req.id::text,
    jsonb_build_object('membership_id', v_member.id, 'user_id', v_member.user_id, 'method', v_req.method),
    p_request_id
  );

  return jsonb_build_object(
    'request', jsonb_build_object('id', v_req.id, 'status', v_req.status, 'decided_by', v_req.decided_by, 'decided_at', v_req.decided_at),
    'membership', jsonb_build_object(
      'id', v_member.id, 'status', v_member.status,
      'verification_level', v_member.verification_level, 'verification_method', v_member.verification_method
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- ADM-08 members and ADM-09 change
-- ---------------------------------------------------------------------------
create function public.admin_list_members(
  p_actor uuid,
  p_college uuid,
  p_q text,
  p_status text,
  p_role text,
  p_limit int,
  p_after_created timestamptz default null,
  p_after_id uuid default null
)
returns table (member jsonb, created_at timestamptz, id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := case when p_q is null then null
    else '%' || replace(replace(replace(p_q, '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
begin
  perform public.admin_assert(p_actor, p_college);
  return query
    select public.admin_member_json(m.id), m.created_at, m.id
    from public.memberships m
    left join public.profiles p on p.user_id = m.user_id
    where m.college_id = p_college
      and (p_status is null or m.status = p_status)
      and (p_role is null or m.role = p_role)
      and (v_like is null or p.display_name ilike v_like)
      and (p_after_created is null or (m.created_at, m.id) < (p_after_created, p_after_id))
    order by m.created_at desc, m.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create function public.admin_update_member(
  p_actor uuid,
  p_college uuid,
  p_membership uuid,
  p_role text,
  p_status text,
  p_reason text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.memberships;
  v_new public.memberships;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_action text;
begin
  perform public.admin_assert(p_actor, p_college);
  if p_role is null and p_status is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_role is not null and p_role not in ('student', 'moderator', 'college_admin') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_status is not null and p_status not in ('active', 'suspended', 'left') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_status in ('suspended', 'left') and (v_reason is null or char_length(v_reason) < 5) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  select * into v_old from public.memberships m where m.id = p_membership and m.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  -- The last active admin of a college can never be demoted, suspended or removed (also a trigger, as a second lock).
  if v_old.role = 'college_admin' and v_old.status = 'active'
     and ((p_role is not null and p_role <> 'college_admin') or (p_status is not null and p_status <> 'active'))
     and not exists (
       select 1 from public.memberships o
       where o.college_id = p_college and o.role = 'college_admin' and o.status = 'active' and o.id <> v_old.id
     ) then
    raise exception 'LAST_ADMIN' using errcode = 'P0001';
  end if;
  -- Nobody changes their own role or status here (no suspending yourself, no demoting yourself).
  if v_old.user_id = p_actor and ((p_role is not null and p_role <> v_old.role) or (p_status is not null and p_status <> v_old.status)) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  -- Allowed moves: active <-> suspended, and active, suspended or pending -> left (removed).
  if p_status is not null and p_status <> v_old.status then
    if not (
      (v_old.status = 'active' and p_status in ('suspended', 'left'))
      or (v_old.status = 'suspended' and p_status in ('active', 'left'))
      or (v_old.status = 'pending' and p_status = 'left')
    ) then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
  end if;
  if p_role is not null and p_role <> v_old.role and v_old.status not in ('active', 'suspended') then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  update public.memberships m
  set role = coalesce(p_role, m.role),
      status = coalesce(p_status, m.status),
      status_reason = case
        when p_status in ('suspended', 'left') then v_reason
        when p_status = 'active' then null
        else m.status_reason end,
      status_changed_by = case when p_status is not null and p_status <> m.status then p_actor else m.status_changed_by end
  where m.id = v_old.id
  returning * into v_new;

  v_action := case
    when v_new.status <> v_old.status and v_new.status = 'suspended' then 'member.suspended'
    when v_new.status <> v_old.status and v_new.status = 'active' then 'member.reinstated'
    when v_new.status <> v_old.status and v_new.status = 'left' then 'member.removed'
    else 'member.role_changed' end;

  perform public.write_audit_log(
    p_college, p_actor, 'college_admin', v_action, 'membership', v_new.id::text,
    jsonb_build_object(
      'user_id', v_new.user_id,
      'role', jsonb_build_object('from', v_old.role, 'to', v_new.role),
      'status', jsonb_build_object('from', v_old.status, 'to', v_new.status)
    ),
    p_request_id
  );
  return public.admin_member_json(v_new.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- ADM-10 audit log and ADM-11 stats (reads)
-- ---------------------------------------------------------------------------
create function public.admin_list_audit_logs(
  p_actor uuid,
  p_college uuid,
  p_action text,
  p_actor_filter uuid,
  p_limit int,
  p_after_created timestamptz default null,
  p_after_id bigint default null
)
returns table (
  id bigint, actor_id uuid, actor_name text, actor_role text, action text,
  target_type text, target_id text, metadata jsonb, request_id text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert(p_actor, p_college);
  return query
    select a.id, a.actor_id, p.display_name, a.actor_role, a.action,
           a.target_type, a.target_id, a.metadata, a.request_id, a.created_at
    from public.audit_logs a
    left join public.profiles p on p.user_id = a.actor_id
    where a.college_id = p_college
      and (p_action is null or a.action = p_action)
      and (p_actor_filter is null or a.actor_id = p_actor_filter)
      and (p_after_created is null or (a.created_at, a.id) < (p_after_created, p_after_id))
    order by a.created_at desc, a.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create function public.admin_stats(p_actor uuid, p_college uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert(p_actor, p_college);
  return jsonb_build_object(
    'total_members', (select count(*) from public.memberships m where m.college_id = p_college and m.status = 'active'),
    'pending_verifications', (select count(*) from public.verification_requests r where r.college_id = p_college and r.status = 'pending'),
    'active_invites', (
      select count(*) from public.invite_codes i
      where i.college_id = p_college and i.revoked_at is null and i.expires_at > now() and i.used_count < i.max_uses
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Rights: service role only. admin_invite_json is a pure helper with no data access of its own.
-- ---------------------------------------------------------------------------
revoke all on function public.admin_assert(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_invite_json(public.invite_codes) from public, anon, authenticated;
revoke all on function public.admin_settings_json(uuid) from public, anon, authenticated;
revoke all on function public.admin_member_json(uuid) from public, anon, authenticated;
revoke all on function public.admin_get_settings(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_update_settings(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_create_invite(uuid, uuid, text, text, int, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_invites(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.admin_revoke_invite(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_list_verification_requests(uuid, uuid, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.admin_decide_verification(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_members(uuid, uuid, text, text, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.admin_update_member(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_audit_logs(uuid, uuid, text, uuid, int, timestamptz, bigint) from public, anon, authenticated;
revoke all on function public.admin_stats(uuid, uuid) from public, anon, authenticated;

grant execute on function public.admin_get_settings(uuid, uuid) to service_role;
grant execute on function public.admin_update_settings(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.admin_create_invite(uuid, uuid, text, text, int, timestamptz, text, text) to service_role;
grant execute on function public.admin_list_invites(uuid, uuid, int) to service_role;
grant execute on function public.admin_revoke_invite(uuid, uuid, uuid, text) to service_role;
grant execute on function public.admin_list_verification_requests(uuid, uuid, text, int, timestamptz, uuid) to service_role;
grant execute on function public.admin_decide_verification(uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.admin_list_members(uuid, uuid, text, text, text, int, timestamptz, uuid) to service_role;
grant execute on function public.admin_update_member(uuid, uuid, uuid, text, text, text, text) to service_role;
grant execute on function public.admin_list_audit_logs(uuid, uuid, text, uuid, int, timestamptz, bigint) to service_role;
grant execute on function public.admin_stats(uuid, uuid) to service_role;
