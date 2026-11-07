-- Migration 0005: notifications, announcements, reports and moderation, blocks, waitlist
-- Task: R2-D4-1. Spec: docs/DATABASE.md sections 2.5 and 6, docs/API_CONTRACT.md NTF-01/02, ANN-01/02, RPT-01 to 04, WL-01,
-- docs/FEATURES_AND_JOURNEYS.md F-07.
-- Lock impact: none for new tables. Two small changes to existing objects (a new nullable column on memberships and
-- a redefined helper function). Expected duration: under 1 second.
-- Compensating migration (only if ever needed): drop the new functions and tables, drop memberships.profile_hidden_at,
-- and restore auth_shares_college_with and admin_decide_verification from migrations 0001 and 0004.
--
-- Same rules as migration 0004: server-only functions check the actor again inside the database, errors carry the
-- stable API code as their message, every moderator action writes exactly ONE audit row in the same transaction.

-- ---------------------------------------------------------------------------
-- notifications: one row per person per event. People read and mark their own. The server writes them.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_valid check (type in (
    'membership.approved', 'membership.rejected', 'announcement.published',
    'report.actioned', 'moderation.warned', 'moderation.hidden'
  )),
  constraint notifications_payload_object check (jsonb_typeof(payload) = 'object')
);

create index notifications_user_idx on public.notifications (user_id, created_at desc, id desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- NTF-01: my notifications, newest first. Runs with the person's own rights, so only their own rows can appear.
create function public.notifications_list(
  p_unread boolean,
  p_limit int,
  p_after_created timestamptz default null,
  p_after_id uuid default null
)
returns table (id uuid, type text, payload jsonb, read_at timestamptz, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select n.id, n.type, n.payload, n.read_at, n.created_at
  from public.notifications n
  where n.user_id = (select auth.uid())
    and (not coalesce(p_unread, false) or n.read_at is null)
    and (p_after_created is null or (n.created_at, n.id) < (p_after_created, p_after_id))
  order by n.created_at desc, n.id desc
  limit least(greatest(p_limit, 1), 51);
$$;

revoke all on function public.notifications_list(boolean, int, timestamptz, uuid) from public, anon;
grant execute on function public.notifications_list(boolean, int, timestamptz, uuid) to authenticated, service_role;

-- Internal helper: add a notification. Not callable from outside (no grants).
create function public.notify_user(
  p_user uuid, p_college uuid, p_type text, p_title text, p_message text, p_extra jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, college_id, type, payload)
  values (
    p_user, p_college, p_type,
    jsonb_build_object('title', p_title, 'message', p_message) || coalesce(p_extra, '{}'::jsonb)
  );
$$;

revoke all on function public.notify_user(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;

-- Housekeeping for a scheduled job (R5 sets it up): keep 90 days of notifications.
create function public.notifications_purge()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  delete from public.notifications where created_at < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.notifications_purge() from public, anon, authenticated;
grant execute on function public.notifications_purge() to service_role;

-- ---------------------------------------------------------------------------
-- Moderator helper: an active moderator or admin of the college (college not suspended)
-- ---------------------------------------------------------------------------
create function public.mod_assert(p_actor uuid, p_college uuid)
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
      and m.status = 'active' and m.role in ('moderator', 'college_admin')
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.colleges c where c.id = p_college and c.status in ('suspended', 'archived')) then
    raise exception 'TENANT_SUSPENDED' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.mod_assert(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A member can hide their profile from classmates (profiles.visibility), and a moderator can hide it for one
-- college (memberships.profile_hidden_at). The profile rule below honours both.
-- ---------------------------------------------------------------------------
alter table public.memberships add column profile_hidden_at timestamptz;

create or replace function public.auth_shares_college_with(target_user uuid)
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
      and other.profile_hidden_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid references auth.users (id) on delete set null,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  status text not null default 'published',
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  moderation_hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_title_length check (char_length(title) between 1 and 120),
  constraint announcements_body_length check (char_length(body) between 1 and 5000),
  constraint announcements_status_valid check (status in ('draft', 'published', 'removed')),
  constraint announcements_expiry_after_publish check (expires_at is null or expires_at > publish_at)
);

create index announcements_college_idx on public.announcements (college_id, pinned desc, publish_at desc, id desc);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

-- Members read what is published, current, and not hidden by a moderator.
create policy announcements_select_members on public.announcements
  for select to authenticated
  using (
    college_id in (select public.auth_member_colleges(1))
    and status = 'published'
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
    and moderation_hidden_at is null
  );

-- Moderators and admins also see drafts, removed and hidden ones of their own college.
create policy announcements_select_moderators on public.announcements
  for select to authenticated
  using (public.is_moderator_or_admin(college_id));

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to authenticated;

-- ANN-01: what a member sees. Runs with the member's own rights (Row Level Security applies) and filters again.
-- Pinned first, then newest. The cursor is (pinned, publish_at, id).
create function public.announcements_list(
  p_college uuid,
  p_limit int,
  p_after_pinned int default null,
  p_after_at timestamptz default null,
  p_after_id uuid default null
)
returns table (
  id uuid, author_id uuid, author_name text, title text, body text, pinned boolean,
  status text, publish_at timestamptz, expires_at timestamptz, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id, a.author_id, coalesce(p.display_name, 'Former member'), a.title, a.body, a.pinned,
         'published'::text, a.publish_at, a.expires_at, a.created_at
  from public.announcements a
  left join public.profiles p on p.user_id = a.author_id
  where a.college_id = p_college
    and a.status = 'published'
    and a.publish_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and a.moderation_hidden_at is null
    and (p_after_at is null or (a.pinned::int, a.publish_at, a.id) < (p_after_pinned, p_after_at, p_after_id))
  order by a.pinned desc, a.publish_at desc, a.id desc
  limit least(greatest(p_limit, 1), 51);
$$;

revoke all on function public.announcements_list(uuid, int, int, timestamptz, uuid) from public, anon;
grant execute on function public.announcements_list(uuid, int, int, timestamptz, uuid) to authenticated, service_role;

create function public.announcement_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'author', jsonb_build_object('user_id', a.author_id, 'display_name', coalesce(p.display_name, 'Former member')),
    'title', a.title,
    'body', a.body,
    'pinned', a.pinned,
    'status', case
      when a.status = 'published' and a.expires_at is not null and a.expires_at <= now() then 'expired'
      else a.status end,
    'publish_at', a.publish_at,
    'expires_at', a.expires_at,
    'created_at', a.created_at
  )
  from public.announcements a
  left join public.profiles p on p.user_id = a.author_id
  where a.id = p_id;
$$;

revoke all on function public.announcement_json(uuid) from public, anon, authenticated;

-- ANN-02 create. Everyone active in the college is told when it is already published (one INSERT, one audit row).
create function public.mod_create_announcement(
  p_actor uuid, p_college uuid, p_title text, p_body text, p_pinned boolean,
  p_publish_at timestamptz default null, p_expires_at timestamptz default null, p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.announcements;
  v_publish timestamptz := coalesce(p_publish_at, now());
begin
  perform public.mod_assert(p_actor, p_college);
  if p_expires_at is not null and p_expires_at <= v_publish then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  insert into public.announcements (college_id, author_id, title, body, pinned, publish_at, expires_at)
  values (p_college, p_actor, btrim(p_title), btrim(p_body), coalesce(p_pinned, false), v_publish, p_expires_at)
  returning * into v_row;

  -- Tell the members now. An announcement planned for later is not announced by a job yet (Day 6 or later).
  if v_publish <= now() then
    insert into public.notifications (user_id, college_id, type, payload)
    select m.user_id, p_college, 'announcement.published',
           jsonb_build_object('title', 'New announcement', 'message', v_row.title, 'announcement_id', v_row.id)
    from public.memberships m
    where m.college_id = p_college and m.status = 'active' and m.user_id <> p_actor;
  end if;

  perform public.write_audit_log(
    p_college, p_actor, (select m.role from public.memberships m where m.user_id = p_actor and m.college_id = p_college),
    'announcement.created', 'announcement', v_row.id::text,
    jsonb_build_object('pinned', v_row.pinned, 'publish_at', v_row.publish_at), p_request_id
  );
  return public.announcement_json(v_row.id);
end;
$$;

-- ANN-02 change or remove (status "removed" is the delete: the row stays for the audit trail).
create function public.mod_update_announcement(
  p_actor uuid, p_college uuid, p_announcement uuid, p_patch jsonb, p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.announcements;
  v_new public.announcements;
begin
  perform public.mod_assert(p_actor, p_college);
  if jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_old from public.announcements a where a.id = p_announcement and a.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_old.status = 'removed' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  update public.announcements a
  set title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else a.title end,
      body = case when p_patch ? 'body' then btrim(p_patch ->> 'body') else a.body end,
      pinned = case when p_patch ? 'pinned' then (p_patch ->> 'pinned')::boolean else a.pinned end,
      publish_at = case when p_patch ? 'publish_at' then (p_patch ->> 'publish_at')::timestamptz else a.publish_at end,
      expires_at = case when p_patch ? 'expires_at' then (p_patch ->> 'expires_at')::timestamptz else a.expires_at end,
      status = case when p_patch ? 'status' then p_patch ->> 'status' else a.status end
  where a.id = v_old.id
  returning * into v_new;

  perform public.write_audit_log(
    p_college, p_actor, (select m.role from public.memberships m where m.user_id = p_actor and m.college_id = p_college),
    case when v_new.status = 'removed' then 'announcement.removed' else 'announcement.updated' end,
    'announcement', v_new.id::text,
    jsonb_build_object('changed', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(p_patch) k)),
    p_request_id
  );
  return public.announcement_json(v_new.id);
end;
$$;

-- The management list for moderators: every announcement of the college, drafts and removed ones included.
create function public.mod_list_announcements(
  p_actor uuid, p_college uuid, p_limit int, p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (item jsonb, created_at timestamptz, id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.mod_assert(p_actor, p_college);
  return query
    select public.announcement_json(a.id), a.created_at, a.id
    from public.announcements a
    where a.college_id = p_college
      and (p_after_created is null or (a.created_at, a.id) < (p_after_created, p_after_id))
    order by a.created_at desc, a.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

-- ---------------------------------------------------------------------------
-- reports and moderation
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_target_type_valid check (target_type in ('profile', 'project', 'team_post', 'announcement')),
  constraint reports_reason_valid check (reason in ('spam', 'harassment', 'inappropriate', 'impersonation', 'scam', 'other')),
  constraint reports_details_length check (details is null or char_length(details) <= 1000),
  constraint reports_status_valid check (status in ('open', 'dismissed', 'actioned'))
);

-- One open report per person and item (docs/DATABASE.md section 2.5).
create unique index reports_one_open_key on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index reports_queue_idx on public.reports (college_id, status, created_at desc, id desc);

alter table public.reports enable row level security;

create policy reports_select_reporter_or_moderator on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator_or_admin(college_id));

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  actor_id uuid,
  action text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint moderation_actions_action_valid check (action in ('dismiss', 'hide', 'warn', 'suspend')),
  constraint moderation_actions_reason_length check (reason is null or char_length(reason) <= 500)
);

create index moderation_actions_report_idx on public.moderation_actions (report_id);

alter table public.moderation_actions enable row level security;

create policy moderation_actions_select_moderators on public.moderation_actions
  for select to authenticated
  using (public.is_moderator_or_admin(college_id));

revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;

-- RPT-01: a member reports something in their own college. The target must exist here and must not be themselves.
create function public.create_report(
  p_actor uuid, p_college uuid, p_target_type text, p_target uuid, p_reason text, p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
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

  if p_target_type = 'announcement' then
    if not exists (
      select 1 from public.announcements a
      where a.id = p_target and a.college_id = p_college and a.status <> 'removed'
    ) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'profile' then
    if p_target = p_actor then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.memberships m
      where m.user_id = p_target and m.college_id = p_college and m.status = 'active'
    ) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  else
    -- Projects and team posts can be reported when their tables exist (Day 5).
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  begin
    insert into public.reports (college_id, reporter_id, target_type, target_id, reason, details)
    values (p_college, p_actor, p_target_type, p_target, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
    returning * into v_report;
  exception when unique_violation then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end;

  return jsonb_build_object('id', v_report.id, 'status', v_report.status, 'created_at', v_report.created_at);
end;
$$;

-- RPT-02: the queue for moderators.
create function public.mod_list_reports(
  p_actor uuid, p_college uuid, p_status text, p_limit int,
  p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (
  id uuid, target_type text, target_id uuid, target_title text, reason text, details text, status text,
  reporter_id uuid, reporter_name text, handled_by uuid, handled_at timestamptz, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.mod_assert(p_actor, p_college);
  return query
    select r.id, r.target_type, r.target_id,
           case r.target_type
             when 'announcement' then (select a.title from public.announcements a where a.id = r.target_id)
             when 'profile' then (select pr.display_name from public.profiles pr where pr.user_id = r.target_id)
             else null end,
           r.reason, r.details, r.status,
           r.reporter_id, coalesce(rp.display_name, 'Former member'), r.handled_by, r.handled_at, r.created_at
    from public.reports r
    left join public.profiles rp on rp.user_id = r.reporter_id
    where r.college_id = p_college
      and (p_status is null or r.status = p_status)
      and (p_after_created is null or (r.created_at, r.id) < (p_after_created, p_after_id))
    order by r.created_at desc, r.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

-- RPT-03: dismiss, hide the content, warn the owner, or suspend the owner. One audit row and one moderation row.
create function public.mod_act_on_report(
  p_actor uuid, p_college uuid, p_report uuid, p_action text, p_note text default null, p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rep public.reports;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_owner uuid;
  v_actor_role text;
  v_target public.memberships;
  v_college_name text;
  v_audit text;
begin
  perform public.mod_assert(p_actor, p_college);
  if p_action not in ('dismiss', 'hide', 'warn', 'suspend') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_action <> 'dismiss' and (v_note is null or char_length(v_note) < 5) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  select * into v_rep from public.reports r where r.id = p_report and r.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_rep.status <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  v_owner := case v_rep.target_type
    when 'profile' then v_rep.target_id
    when 'announcement' then (select a.author_id from public.announcements a where a.id = v_rep.target_id)
    else null end;
  -- Nobody handles a report about themselves.
  if v_owner is not null and v_owner = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select m.role into v_actor_role from public.memberships m where m.user_id = p_actor and m.college_id = p_college;
  select c.name into v_college_name from public.colleges c where c.id = p_college;

  if p_action = 'hide' then
    if v_rep.target_type = 'announcement' then
      update public.announcements set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'profile' then
      update public.memberships set profile_hidden_at = now() where user_id = v_rep.target_id and college_id = p_college;
    else
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    if v_owner is not null then
      perform public.notify_user(v_owner, p_college, 'moderation.hidden', 'Your content was hidden',
        'A moderator of ' || v_college_name || ' hid your content: ' || v_note, jsonb_build_object('report_id', v_rep.id));
    end if;
  elsif p_action = 'warn' then
    if v_owner is null then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    perform public.notify_user(v_owner, p_college, 'moderation.warned', 'A moderator sent you a warning',
      v_note, jsonb_build_object('report_id', v_rep.id));
  elsif p_action = 'suspend' then
    if v_owner is null then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    select * into v_target from public.memberships m where m.user_id = v_owner and m.college_id = p_college for update;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    -- A moderator may suspend students. An admin may also suspend moderators. Nobody suspends an admin here.
    if v_target.role = 'college_admin' or (v_target.role = 'moderator' and v_actor_role <> 'college_admin') then
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    if v_target.status <> 'active' then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
    update public.memberships
    set status = 'suspended', status_reason = v_note, status_changed_by = p_actor
    where id = v_target.id;
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
      handled_by = p_actor, handled_at = now()
  where id = v_rep.id returning * into v_rep;

  insert into public.moderation_actions (report_id, college_id, actor_id, action, reason)
  values (v_rep.id, p_college, p_actor, p_action, v_note);

  if v_rep.reporter_id is not null and v_rep.reporter_id <> p_actor then
    perform public.notify_user(v_rep.reporter_id, p_college, 'report.actioned', 'Your report was reviewed',
      case when p_action = 'dismiss' then 'A moderator reviewed your report and took no action.'
           else 'A moderator reviewed your report and took action.' end,
      jsonb_build_object('report_id', v_rep.id, 'outcome', p_action));
  end if;

  v_audit := case p_action
    when 'dismiss' then 'report.dismissed'
    when 'hide' then 'report.content_hidden'
    when 'warn' then 'report.owner_warned'
    else 'report.member_suspended' end;
  perform public.write_audit_log(
    p_college, p_actor, v_actor_role, v_audit, 'report', v_rep.id::text,
    jsonb_build_object('target_type', v_rep.target_type, 'target_id', v_rep.target_id), p_request_id
  );

  return jsonb_build_object('report', jsonb_build_object(
    'id', v_rep.id, 'status', v_rep.status, 'handled_by', v_rep.handled_by, 'handled_at', v_rep.handled_at));
end;
$$;

-- ---------------------------------------------------------------------------
-- blocks (RPT-04): you stop seeing someone, and they stop seeing you, in lists that honour blocks (Team Finder, Day 5).
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy blocks_select_own on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.blocks from anon, authenticated;
grant select on public.blocks to authenticated;

-- True when either person blocked the other. Later tables use it in their policies.
create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks x
    where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated, service_role;

-- The target must be an active member of a college the actor is active in (so ids of strangers are never confirmed).
create function public.block_user(p_actor uuid, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or p_target is null or p_actor = p_target then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from public.memberships me
    join public.memberships other on other.college_id = me.college_id
    where me.user_id = p_actor and me.status = 'active'
      and other.user_id = p_target and other.status = 'active'
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (p_actor, p_target) on conflict do nothing;
end;
$$;

create function public.unblock_user(p_actor uuid, p_target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = p_actor and blocked_id = p_target;
$$;

-- ---------------------------------------------------------------------------
-- waitlist (WL-01): the landing page form. Same email twice never makes a second row.
-- ---------------------------------------------------------------------------
create table public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  college_name text not null,
  contact_name text not null,
  contact_email text not null,
  role text not null,
  source text,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint waitlist_college_name_length check (char_length(college_name) between 1 and 120),
  constraint waitlist_contact_name_length check (char_length(contact_name) between 1 and 120),
  constraint waitlist_email_lowercase check (contact_email = lower(contact_email) and char_length(contact_email) <= 254),
  constraint waitlist_role_valid check (role in ('student', 'faculty', 'college_admin', 'other')),
  constraint waitlist_source_length check (source is null or char_length(source) <= 40),
  constraint waitlist_contact_email_key unique (contact_email)
);

alter table public.waitlist_leads enable row level security;

create policy waitlist_leads_no_client_access on public.waitlist_leads
  for all to authenticated
  using (false)
  with check (false);

revoke all on public.waitlist_leads from anon, authenticated;

-- Returns true when a new row was added, false when the address was already on the list.
create function public.join_waitlist(
  p_college_name text, p_contact_name text, p_contact_email text, p_role text, p_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.waitlist_leads (college_name, contact_name, contact_email, role, source)
  values (btrim(p_college_name), btrim(p_contact_name), lower(btrim(p_contact_email)), p_role, nullif(btrim(coalesce(p_source, '')), ''))
  on conflict (contact_email) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- Retention: 12 months (docs/DATABASE.md section 6). For a scheduled job.
create function public.waitlist_purge()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted bigint;
begin
  delete from public.waitlist_leads where created_at < now() - interval '12 months';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------------
-- The admin decision now tells the applicant (same transaction as the decision).
-- Same function as migration 0004 plus the notify_user call.
-- ---------------------------------------------------------------------------
create or replace function public.admin_decide_verification(
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

  -- Tell the applicant in the same transaction.
  perform public.notify_user(
    v_member.user_id, p_college,
    case p_decision when 'approved' then 'membership.approved' else 'membership.rejected' end,
    case p_decision when 'approved' then 'You are in' else 'Your request was not approved' end,
    case p_decision
      when 'approved' then 'Your request to join ' || (select c.name from public.colleges c where c.id = p_college) || ' was approved.'
      else 'Your request to join ' || (select c.name from public.colleges c where c.id = p_college) || ' was not approved: ' || v_reason
    end,
    jsonb_build_object('college_slug', (select c.slug from public.colleges c where c.id = p_college))
  );

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
-- Rights: the server only, except the two members' functions above.
-- ---------------------------------------------------------------------------
revoke all on function public.announcement_json(uuid) from public, anon, authenticated;
revoke all on function public.mod_create_announcement(uuid, uuid, text, text, boolean, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.mod_update_announcement(uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.mod_list_announcements(uuid, uuid, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.create_report(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.mod_list_reports(uuid, uuid, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.mod_act_on_report(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.block_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.unblock_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.join_waitlist(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.waitlist_purge() from public, anon, authenticated;

grant execute on function public.mod_create_announcement(uuid, uuid, text, text, boolean, timestamptz, timestamptz, text) to service_role;
grant execute on function public.mod_update_announcement(uuid, uuid, uuid, jsonb, text) to service_role;
grant execute on function public.mod_list_announcements(uuid, uuid, int, timestamptz, uuid) to service_role;
grant execute on function public.create_report(uuid, uuid, text, uuid, text, text) to service_role;
grant execute on function public.mod_list_reports(uuid, uuid, text, int, timestamptz, uuid) to service_role;
grant execute on function public.mod_act_on_report(uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.block_user(uuid, uuid) to service_role;
grant execute on function public.unblock_user(uuid, uuid) to service_role;
grant execute on function public.join_waitlist(text, text, text, text, text) to service_role;
grant execute on function public.waitlist_purge() to service_role;
