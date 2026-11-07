-- Migration: curated opportunities, saved opportunities, deadline reminders (R2-D7-1).
-- Spec: docs/DATABASE.md section 2 (opportunities, saved_opportunities, reminders), docs/FEATURES_AND_JOURNEYS.md F-14 and F-15.
-- Same rules as Team Finder: tables closed to clients, the server calls functions with the service role,
-- every function checks the actor again. No scraping: each listing has a poster and a last verified date.

alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'membership.expired', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn', 'team.post_expired',
  'opportunity.deadline_soon'
));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  title text not null,
  org text not null,
  kind text not null,
  location text not null default '',
  mode text not null default 'onsite',
  stipend_min integer,
  stipend_max integer,
  eligibility text not null default '',
  skills text[] not null default '{}',
  deadline timestamptz,
  apply_url text not null,
  posted_by uuid references auth.users (id) on delete set null,
  status text not null default 'published',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_title_length check (char_length(title) between 3 and 120),
  constraint opportunities_org_length check (char_length(org) between 1 and 120),
  constraint opportunities_kind_valid check (kind in ('internship', 'job', 'hackathon', 'competition', 'scholarship')),
  constraint opportunities_mode_valid check (mode in ('onsite', 'remote', 'hybrid')),
  constraint opportunities_location_length check (char_length(location) <= 120),
  constraint opportunities_stipend_valid check (
    (stipend_min is null or stipend_min >= 0)
    and (stipend_max is null or stipend_max >= 0)
    and (stipend_min is null or stipend_max is null or stipend_max >= stipend_min)
  ),
  constraint opportunities_eligibility_length check (char_length(eligibility) <= 2000),
  constraint opportunities_skills_valid check (cardinality(skills) <= 10),
  constraint opportunities_apply_url_https check (char_length(apply_url) <= 500 and apply_url ~ '^https://[^[:space:]]+$'),
  constraint opportunities_status_valid check (status in ('draft', 'published', 'expired', 'removed'))
);

create index opportunities_college_idx on public.opportunities (college_id, status, created_at desc, id desc);
create index opportunities_deadline_idx on public.opportunities (college_id, deadline) where status = 'published';

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create table public.saved_opportunities (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

-- Per person settings that are not part of the public profile.
create table public.user_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- One row per reminder that was sent. The unique key stops a second reminder for the same deadline.
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref_type text not null,
  ref_id uuid not null,
  remind_on date not null,
  created_at timestamptz not null default now(),
  constraint reminders_kind_valid check (kind in ('opportunity_deadline')),
  constraint reminders_unique_key unique (user_id, kind, ref_id, remind_on)
);

alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.user_prefs enable row level security;
alter table public.reminders enable row level security;

create policy opportunities_no_client_access on public.opportunities for select to authenticated using (false);
create policy saved_opportunities_no_client_access on public.saved_opportunities for select to authenticated using (false);
create policy user_prefs_no_client_access on public.user_prefs for select to authenticated using (false);
create policy reminders_no_client_access on public.reminders for select to authenticated using (false);

revoke all on public.opportunities from anon, authenticated;
revoke all on public.saved_opportunities from anon, authenticated;
revoke all on public.user_prefs from anon, authenticated;
revoke all on public.reminders from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- An active member (level 1) of an active college whose Career tab is on (features.career is not false).
create function public.opp_assert(p_actor uuid, p_college uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor is null or not exists (
    select 1 from public.memberships m
    where m.user_id = p_actor and m.college_id = p_college and m.status = 'active' and m.verification_level >= 1
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.colleges c where c.id = p_college and c.status in ('suspended', 'archived')) then
    raise exception 'TENANT_SUSPENDED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.college_settings s where s.college_id = p_college and s.features -> 'career' = 'false'::jsonb) then
    raise exception 'FEATURE_DISABLED' using errcode = 'P0001';
  end if;
end;
$$;

create function public.opp_shown_status(p_status text, p_deadline timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_status = 'published' and p_deadline is not null and p_deadline <= now() then 'expired' else p_status end;
$$;

create function public.opp_json(p_opp uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'title', o.title,
    'org', o.org,
    'kind', o.kind,
    'location', o.location,
    'mode', o.mode,
    'stipend_min', o.stipend_min,
    'stipend_max', o.stipend_max,
    'eligibility', o.eligibility,
    'skills', to_jsonb(o.skills),
    'deadline', o.deadline,
    'apply_url', o.apply_url,
    'posted_by', coalesce(pr.display_name, 'Former member'),
    'last_verified_at', o.last_verified_at,
    'status', public.opp_shown_status(o.status, o.deadline),
    'created_at', o.created_at,
    'saved', s.opportunity_id is not null,
    -- the listing was edited after this person saved it: show a "changed" badge
    'changed_since_saved', s.opportunity_id is not null and o.updated_at > s.saved_at
  )
  from public.opportunities o
  left join public.profiles pr on pr.user_id = o.posted_by
  left join public.saved_opportunities s on s.opportunity_id = o.id and s.user_id = p_actor
  where o.id = p_opp;
$$;

-- ---------------------------------------------------------------------------
-- OPP-01 list, OPP-02 detail (members). Draft and removed listings are never shown to members.
-- p_deadline: any | 7d | 30d | hide_closed
-- ---------------------------------------------------------------------------
create function public.opp_list(
  p_actor uuid, p_college uuid, p_kinds text[], p_skills text[], p_mode text, p_location text,
  p_deadline text, p_q text, p_saved boolean, p_limit int,
  p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_loc text := nullif(btrim(coalesce(p_location, '')), '');
  v_skills text[] := (select coalesce(array_agg(lower(btrim(x))), '{}') from unnest(coalesce(p_skills, '{}')) x);
begin
  perform public.opp_assert(p_actor, p_college);
  if p_deadline is not null and p_deadline not in ('any', '7d', '30d', 'hide_closed') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  return query
    select o.id, o.created_at, public.opp_json(o.id, p_actor)
    from public.opportunities o
    where o.college_id = p_college
      and o.status in ('published', 'expired')
      and (p_kinds is null or cardinality(p_kinds) = 0 or o.kind = any (p_kinds))
      and (cardinality(v_skills) = 0 or exists (select 1 from unnest(o.skills) sk where lower(sk) = any (v_skills)))
      and (p_mode is null or o.mode = p_mode)
      and (v_loc is null or o.location ilike '%' || replace(replace(replace(v_loc, '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and (v_q is null
           or o.title ilike '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%'
           or o.org ilike '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and (p_deadline is null or p_deadline = 'any'
           or (p_deadline = 'hide_closed' and (o.deadline is null or o.deadline > now()))
           or (p_deadline = '7d' and o.deadline > now() and o.deadline <= now() + interval '7 days')
           or (p_deadline = '30d' and o.deadline > now() and o.deadline <= now() + interval '30 days'))
      and (not coalesce(p_saved, false) or exists (
            select 1 from public.saved_opportunities s where s.opportunity_id = o.id and s.user_id = p_actor))
      and (p_after_created is null or (o.created_at, o.id) < (p_after_created, p_after_id))
    order by o.created_at desc, o.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create function public.opp_get(p_actor uuid, p_college uuid, p_opp uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.opp_assert(p_actor, p_college);
  if not exists (
    select 1 from public.opportunities o
    where o.id = p_opp and o.college_id = p_college and o.status in ('published', 'expired')
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.opp_json(p_opp, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- OPP-04 save / unsave. Works from the id alone (route /me/saved-opportunities/{id}): the college is the
-- listing's college, and the caller must be an active member of it, otherwise the listing "does not exist".
-- Safe to repeat.
-- ---------------------------------------------------------------------------
create function public.opp_set_saved(p_actor uuid, p_opp uuid, p_saved boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college uuid;
begin
  select o.college_id into v_college from public.opportunities o
  where o.id = p_opp and o.status in ('published', 'expired');
  if v_college is null or not exists (
    select 1 from public.memberships m
    where m.user_id = p_actor and m.college_id = v_college and m.status = 'active' and m.verification_level >= 1
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform public.opp_assert(p_actor, v_college);
  if p_saved then
    insert into public.saved_opportunities (user_id, opportunity_id) values (p_actor, p_opp) on conflict do nothing;
  else
    delete from public.saved_opportunities where user_id = p_actor and opportunity_id = p_opp;
  end if;
  return jsonb_build_object('saved', p_saved, 'opportunity_id', p_opp);
end;
$$;

-- ---------------------------------------------------------------------------
-- OPP-03 curate (moderators and admins). One audit row for each change.
-- ---------------------------------------------------------------------------
create function public.mod_create_opportunity(p_actor uuid, p_college uuid, p_data jsonb, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.opportunities;
begin
  perform public.mod_assert(p_actor, p_college);
  insert into public.opportunities (
    college_id, title, org, kind, location, mode, stipend_min, stipend_max, eligibility, skills, deadline,
    apply_url, posted_by, status
  )
  values (
    p_college, btrim(p_data ->> 'title'), btrim(p_data ->> 'org'), p_data ->> 'kind',
    btrim(coalesce(p_data ->> 'location', '')), coalesce(p_data ->> 'mode', 'onsite'),
    (p_data ->> 'stipend_min')::integer, (p_data ->> 'stipend_max')::integer,
    btrim(coalesce(p_data ->> 'eligibility', '')),
    coalesce((select array_agg(btrim(x)) from jsonb_array_elements_text(coalesce(p_data -> 'skills', '[]'::jsonb)) x), '{}'),
    (p_data ->> 'deadline')::timestamptz, p_data ->> 'apply_url', p_actor,
    coalesce(p_data ->> 'status', 'published')
  )
  returning * into v_row;
  perform public.write_audit_log(
    p_college, p_actor, (select m.role from public.memberships m where m.user_id = p_actor and m.college_id = p_college),
    'opportunity.created', 'opportunity', v_row.id::text,
    jsonb_build_object('kind', v_row.kind, 'status', v_row.status), p_request_id);
  return public.opp_json(v_row.id, p_actor);
end;
$$;

create function public.mod_update_opportunity(
  p_actor uuid, p_college uuid, p_opp uuid, p_patch jsonb, p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.opportunities;
  v_new public.opportunities;
begin
  perform public.mod_assert(p_actor, p_college);
  if jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_old from public.opportunities o where o.id = p_opp and o.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_old.status = 'removed' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.opportunities o
  set title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else o.title end,
      org = case when p_patch ? 'org' then btrim(p_patch ->> 'org') else o.org end,
      kind = case when p_patch ? 'kind' then p_patch ->> 'kind' else o.kind end,
      location = case when p_patch ? 'location' then btrim(coalesce(p_patch ->> 'location', '')) else o.location end,
      mode = case when p_patch ? 'mode' then p_patch ->> 'mode' else o.mode end,
      stipend_min = case when p_patch ? 'stipend_min' then (p_patch ->> 'stipend_min')::integer else o.stipend_min end,
      stipend_max = case when p_patch ? 'stipend_max' then (p_patch ->> 'stipend_max')::integer else o.stipend_max end,
      eligibility = case when p_patch ? 'eligibility' then btrim(coalesce(p_patch ->> 'eligibility', '')) else o.eligibility end,
      skills = case when p_patch ? 'skills'
                    then coalesce((select array_agg(btrim(x)) from jsonb_array_elements_text(p_patch -> 'skills') x), '{}')
                    else o.skills end,
      deadline = case when p_patch ? 'deadline' then (p_patch ->> 'deadline')::timestamptz else o.deadline end,
      apply_url = case when p_patch ? 'apply_url' then p_patch ->> 'apply_url' else o.apply_url end,
      status = case when p_patch ? 'status' then p_patch ->> 'status' else o.status end,
      -- "I checked this listing today": moves the verified date without any other change
      last_verified_at = case when coalesce((p_patch ->> 'verified')::boolean, false) then now() else o.last_verified_at end
  where o.id = v_old.id
  returning * into v_new;
  perform public.write_audit_log(
    p_college, p_actor, (select m.role from public.memberships m where m.user_id = p_actor and m.college_id = p_college),
    'opportunity.updated', 'opportunity', v_new.id::text,
    jsonb_build_object('changed', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(p_patch) k)),
    p_request_id);
  return public.opp_json(v_new.id, p_actor);
end;
$$;

create function public.mod_remove_opportunity(p_actor uuid, p_college uuid, p_opp uuid, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.opportunities;
begin
  perform public.mod_assert(p_actor, p_college);
  select * into v_row from public.opportunities o where o.id = p_opp and o.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_row.status = 'removed' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.opportunities set status = 'removed' where id = p_opp;
  perform public.write_audit_log(
    p_college, p_actor, (select m.role from public.memberships m where m.user_id = p_actor and m.college_id = p_college),
    'opportunity.removed', 'opportunity', p_opp::text, '{}'::jsonb, p_request_id);
  return jsonb_build_object('id', p_opp, 'status', 'removed');
end;
$$;

-- The management list: every listing of the college, drafts and removed ones included.
create function public.mod_list_opportunities(
  p_actor uuid, p_college uuid, p_status text, p_limit int,
  p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.mod_assert(p_actor, p_college);
  return query
    select o.id, o.created_at, public.opp_json(o.id, p_actor) || jsonb_build_object('raw_status', o.status)
    from public.opportunities o
    where o.college_id = p_college
      and (p_status is null or o.status = p_status)
      and (p_after_created is null or (o.created_at, o.id) < (p_after_created, p_after_id))
    order by o.created_at desc, o.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminders (F-15). The preference is per person. The job runs inside maintenance_run.
-- ---------------------------------------------------------------------------
create function public.rem_get(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.reminders_enabled from public.user_prefs u where u.user_id = p_actor), true);
$$;

create function public.rem_set(p_actor uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or p_enabled is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.user_prefs (user_id, reminders_enabled) values (p_actor, p_enabled)
  on conflict (user_id) do update set reminders_enabled = excluded.reminders_enabled, updated_at = now();
  return p_enabled;
end;
$$;

-- One notification for each saved listing whose deadline is within 48 hours, once per deadline date, and only for
-- people who have not switched reminders off and are still active members. Returns how many were sent.
create function public.reminders_run()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_sent int := 0;
  v_id uuid;
begin
  for v_row in
    select s.user_id, o.id as opp_id, o.college_id, o.title, o.deadline
    from public.saved_opportunities s
    join public.opportunities o on o.id = s.opportunity_id
    where o.status = 'published' and o.deadline > now() and o.deadline <= now() + interval '48 hours'
      and exists (select 1 from public.memberships m
                  where m.user_id = s.user_id and m.college_id = o.college_id and m.status = 'active')
      and public.rem_get(s.user_id)
  loop
    insert into public.reminders (user_id, kind, ref_type, ref_id, remind_on)
    values (v_row.user_id, 'opportunity_deadline', 'opportunity', v_row.opp_id, (v_row.deadline at time zone 'UTC')::date)
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      perform public.notify_user(v_row.user_id, v_row.college_id, 'opportunity.deadline_soon', 'Deadline coming up',
        '"' || v_row.title || '" closes in less than 48 hours.',
        jsonb_build_object('opportunity_id', v_row.opp_id));
      v_sent := v_sent + 1;
    end if;
    v_id := null;
  end loop;
  return v_sent;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.opp_assert(uuid, uuid) from public, anon, authenticated;
revoke all on function public.opp_shown_status(text, timestamptz) from public, anon, authenticated;
revoke all on function public.opp_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.opp_list(uuid, uuid, text[], text[], text, text, text, text, boolean, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.opp_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.opp_set_saved(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.mod_create_opportunity(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.mod_update_opportunity(uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.mod_remove_opportunity(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.mod_list_opportunities(uuid, uuid, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.rem_get(uuid) from public, anon, authenticated;
revoke all on function public.rem_set(uuid, boolean) from public, anon, authenticated;
revoke all on function public.reminders_run() from public, anon, authenticated;

grant execute on function public.opp_assert(uuid, uuid) to service_role;
grant execute on function public.opp_shown_status(text, timestamptz) to service_role;
grant execute on function public.opp_json(uuid, uuid) to service_role;
grant execute on function public.opp_list(uuid, uuid, text[], text[], text, text, text, text, boolean, int, timestamptz, uuid) to service_role;
grant execute on function public.opp_get(uuid, uuid, uuid) to service_role;
grant execute on function public.opp_set_saved(uuid, uuid, boolean) to service_role;
grant execute on function public.mod_create_opportunity(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.mod_update_opportunity(uuid, uuid, uuid, jsonb, text) to service_role;
grant execute on function public.mod_remove_opportunity(uuid, uuid, uuid, text) to service_role;
grant execute on function public.mod_list_opportunities(uuid, uuid, text, int, timestamptz, uuid) to service_role;
grant execute on function public.rem_get(uuid) to service_role;
grant execute on function public.rem_set(uuid, boolean) to service_role;
grant execute on function public.reminders_run() to service_role;

-- The clean up function of Day 6, extended: opportunities past their deadline become expired and the
-- reminders job runs.
create or replace function public.maintenance_run()
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
  v_reminders int;
  v_opps bigint;
  v_old_reminders bigint;
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

  -- deadline reminders for saved opportunities (once per deadline), and old reminder rows go after 90 days
  v_reminders := public.reminders_run();
  delete from public.reminders where created_at < now() - interval '90 days';
  get diagnostics v_old_reminders = row_count;

  -- opportunities past their deadline are marked expired
  update public.opportunities set status = 'expired' where status = 'published' and deadline is not null and deadline <= now();
  get diagnostics v_opps = row_count;

  return jsonb_build_object(
    'team_posts_expired', v_posts,
    'opportunities_expired', v_opps,
    'reminders_sent', v_reminders,
    'reminders_deleted', v_old_reminders,
    'team_requests_cancelled', v_post_requests,
    'join_requests_expired', v_verifications,
    'idempotency_keys_deleted', v_idem,
    'rate_limit_events_deleted', public.rate_limit_purge(),
    'notifications_deleted', public.notifications_purge(),
    'waitlist_deleted', public.waitlist_purge()
  );
end;
$$;

