-- Migration: safe retries and expiry (R2-D6-1). Spec: docs/ERROR_HANDLING.md section 3, docs/DATABASE.md sections 2.4 and 2.9.
-- 1. A retry or a double click with the same Idempotency-Key runs the work once, even when both arrive at the same moment.
-- 2. One clean up function (maintenance_run) that a scheduler calls: expire old things, tell the people, delete old rows.

-- ---------------------------------------------------------------------------
-- Idempotency: claim the key BEFORE doing the work
-- ---------------------------------------------------------------------------
alter table public.idempotency_keys
  add column state text not null default 'done',
  add column locked_until timestamptz;
alter table public.idempotency_keys alter column response drop not null;
alter table public.idempotency_keys alter column status_code drop not null;
alter table public.idempotency_keys add constraint idempotency_keys_state_valid check (
  (state = 'done' and response is not null and status_code is not null)
  or (state = 'in_progress' and locked_until is not null)
);

create index idempotency_keys_expiry_idx on public.idempotency_keys (expires_at);

-- Outcomes: claimed (go and do the work), replay (return the saved answer), in_progress (someone else is doing it
-- right now), mismatch (same key, different body). A claim that is older than 60 seconds is taken over, so a crashed
-- request cannot block a key for 24 hours.
create function public.idem_claim(p_user uuid, p_key text, p_route text, p_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.idempotency_keys;
begin
  insert into public.idempotency_keys (user_id, key, route, request_hash, state, locked_until, response, status_code, expires_at)
  values (p_user, p_key, p_route, p_hash, 'in_progress', now() + interval '60 seconds', null, null, now() + interval '24 hours')
  on conflict (user_id, key, route) do nothing;
  if found then
    return jsonb_build_object('outcome', 'claimed');
  end if;

  select * into v_row from public.idempotency_keys k
  where k.user_id = p_user and k.key = p_key and k.route = p_route for update;
  if not found then
    -- deleted between the two statements: try once more
    return public.idem_claim(p_user, p_key, p_route, p_hash);
  end if;

  if v_row.expires_at <= now() then
    update public.idempotency_keys
    set request_hash = p_hash, state = 'in_progress', locked_until = now() + interval '60 seconds',
        response = null, status_code = null, created_at = now(), expires_at = now() + interval '24 hours'
    where user_id = p_user and key = p_key and route = p_route;
    return jsonb_build_object('outcome', 'claimed');
  end if;
  if v_row.request_hash <> p_hash then
    return jsonb_build_object('outcome', 'mismatch');
  end if;
  if v_row.state = 'done' then
    return jsonb_build_object('outcome', 'replay', 'status_code', v_row.status_code, 'response', v_row.response);
  end if;
  if v_row.locked_until <= now() then
    update public.idempotency_keys set locked_until = now() + interval '60 seconds'
    where user_id = p_user and key = p_key and route = p_route;
    return jsonb_build_object('outcome', 'claimed');
  end if;
  return jsonb_build_object('outcome', 'in_progress');
end;
$$;

create function public.idem_complete(p_user uuid, p_key text, p_route text, p_status int, p_response jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.idempotency_keys
  set state = 'done', status_code = p_status, response = p_response, locked_until = null
  where user_id = p_user and key = p_key and route = p_route and state = 'in_progress';
$$;

-- The work failed: forget the claim, so the same key can try again (only successful answers are kept).
create function public.idem_release(p_user uuid, p_key text, p_route text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.idempotency_keys
  where user_id = p_user and key = p_key and route = p_route and state = 'in_progress';
$$;

revoke all on function public.idem_claim(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.idem_complete(uuid, text, text, int, jsonb) from public, anon, authenticated;
revoke all on function public.idem_release(uuid, text, text) from public, anon, authenticated;
grant execute on function public.idem_claim(uuid, text, text, text) to service_role;
grant execute on function public.idem_complete(uuid, text, text, int, jsonb) to service_role;
grant execute on function public.idem_release(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- New notification types
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'membership.expired', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn', 'team.post_expired'
));

-- ---------------------------------------------------------------------------
-- maintenance_run: called by a scheduler (POST /api/internal/maintenance) about once an hour. Safe to call twice.
--  * team posts past their deadline become `expired`; waiting requests are cancelled; the author and applicants are told
--  * join requests that waited more than 30 days for an admin become `expired`; the person is told and can apply again
--  * old rows are deleted: idempotency keys, rate limit events, notifications (90 days), waitlist (12 months)
-- ---------------------------------------------------------------------------
create function public.maintenance_run()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post record;
  v_req record;
  v_posts int := 0;
  v_post_requests int := 0;
  v_verifications int := 0;
  v_college_name text;
  v_idem bigint;
begin
  for v_post in
    update public.team_posts p set status = 'expired'
    where p.status = 'open' and p.deadline is not null and p.deadline <= now()
    returning p.id, p.college_id, p.author_id, p.title
  loop
    v_posts := v_posts + 1;
    for v_req in
      update public.join_requests j set status = 'cancelled', decided_at = now()
      where j.post_id = v_post.id and j.status = 'pending'
      returning j.id, j.applicant_id
    loop
      v_post_requests := v_post_requests + 1;
      perform public.notify_user(v_req.applicant_id, v_post.college_id, 'team.request_cancelled', 'Team post ended',
        'The deadline of "' || v_post.title || '" passed, so your request was cancelled.',
        jsonb_build_object('post_id', v_post.id, 'request_id', v_req.id));
    end loop;
    perform public.notify_user(v_post.author_id, v_post.college_id, 'team.post_expired', 'Your team post ended',
      'The deadline of "' || v_post.title || '" passed, so the post is closed.',
      jsonb_build_object('post_id', v_post.id));
  end loop;

  for v_req in
    update public.verification_requests r set status = 'expired', decided_at = now(), decision_reason = 'No decision within 30 days'
    where r.status = 'pending' and r.created_at < now() - interval '30 days'
    returning r.id, r.membership_id, r.college_id
  loop
    v_verifications := v_verifications + 1;
    update public.memberships m
    set status = 'left', status_reason = 'Join request expired after 30 days'
    where m.id = v_req.membership_id and m.status = 'pending';
    select c.name into v_college_name from public.colleges c where c.id = v_req.college_id;
    perform public.notify_user(
      (select m.user_id from public.memberships m where m.id = v_req.membership_id), v_req.college_id,
      'membership.expired', 'Your join request expired',
      'No one at ' || coalesce(v_college_name, 'the college') || ' decided your request in 30 days. You can apply again.',
      jsonb_build_object('college_id', v_req.college_id));
  end loop;

  delete from public.idempotency_keys where expires_at < now() - interval '1 hour';
  get diagnostics v_idem = row_count;

  return jsonb_build_object(
    'team_posts_expired', v_posts,
    'team_requests_cancelled', v_post_requests,
    'join_requests_expired', v_verifications,
    'idempotency_keys_deleted', v_idem,
    'rate_limit_events_deleted', public.rate_limit_purge(),
    'notifications_deleted', public.notifications_purge(),
    'waitlist_deleted', public.waitlist_purge()
  );
end;
$$;

revoke all on function public.maintenance_run() from public, anon, authenticated;
grant execute on function public.maintenance_run() to service_role;

-- ---------------------------------------------------------------------------
-- TEN-01 now also tells which of the three tabs a college has switched on, so R3 can hide a tab without a login.
-- A tab is on unless the admin set features.<name> to false (ADM-03). Only these three flags are public.
-- ---------------------------------------------------------------------------
create or replace view public.public_college_branding
with (security_invoker = false) as
select
  c.slug,
  c.name,
  c.short_name,
  c.city,
  c.state,
  c.accent_hex,
  s.allowed_methods,
  s.require_admin_approval,
  jsonb_build_object(
    'campus', coalesce(s.features -> 'campus', 'true'::jsonb),
    'collaborate', coalesce(s.features -> 'collaborate', 'true'::jsonb),
    'career', coalesce(s.features -> 'career', 'true'::jsonb)
  ) as modules
from public.colleges c
join public.college_settings s on s.college_id = c.id
where c.status = 'active';
