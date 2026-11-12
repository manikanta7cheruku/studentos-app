-- Migration: reports for everything, and feedback (R3-D20, decision D-40).
--   1. A member can now report a buzz, a comment, an event, a market or lost and found post, and a venue (before: plans,
--      profiles and announcements). A moderator can hide any of them from the same queue. Hiding a buzz, an event or a post
--      uses the same removal as the admin tools, so the author gets the reason too.
--   2. Feedback: anyone signed in can send a short note (an idea, a problem, something else) from the app. The owner reads it
--      in the dashboard. Ten a day per person.
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) calls the
-- functions.

-- ---------------------------------------------------------------------------
-- 1. Reports
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint reports_target_type_valid;
alter table public.reports add constraint reports_target_type_valid check (
  target_type in ('profile', 'project', 'team_post', 'announcement', 'idea', 'idea_comment', 'event', 'listing', 'venue')
);

create or replace function public.create_report(
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
  elsif p_target_type = 'team_post' then
    if not exists (
      select 1 from public.team_posts t
      where t.id = p_target and t.college_id = p_college and t.status <> 'removed'
    ) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.team_posts t where t.id = p_target and t.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'idea' then
    if not exists (select 1 from public.ideas i where i.id = p_target and i.college_id = p_college and i.status <> 'removed') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.ideas i where i.id = p_target and i.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'idea_comment' then
    if not exists (select 1 from public.idea_comments c where c.id = p_target and c.college_id = p_college and c.status = 'published') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.idea_comments c where c.id = p_target and c.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'event' then
    if not exists (select 1 from public.events e where e.id = p_target and e.college_id = p_college and e.status <> 'removed') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.events e where e.id = p_target and e.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'listing' then
    if not exists (select 1 from public.board_posts b where b.id = p_target and b.college_id = p_college and b.status <> 'removed') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.board_posts b where b.id = p_target and b.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'venue' then
    if not exists (select 1 from public.venues v where v.id = p_target and v.college_id = p_college and v.status = 'active') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.venues v where v.id = p_target and v.created_by = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  else
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

create or replace function public.mod_list_reports(
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
             when 'team_post' then (select t.title from public.team_posts t where t.id = r.target_id)
             when 'idea' then (select coalesce(nullif(btrim(i.title), ''), left(i.body, 60)) from public.ideas i where i.id = r.target_id)
             when 'idea_comment' then (select left(c.body, 60) from public.idea_comments c where c.id = r.target_id)
             when 'event' then (select e.title from public.events e where e.id = r.target_id)
             when 'listing' then (select b.title from public.board_posts b where b.id = r.target_id)
             when 'venue' then (select v.name from public.venues v where v.id = r.target_id)
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

create or replace function public.mod_act_on_report(
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
  v_told boolean := false;
  v_removal text;
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
    when 'team_post' then (select t.author_id from public.team_posts t where t.id = v_rep.target_id)
    when 'idea' then (select i.author_id from public.ideas i where i.id = v_rep.target_id)
    when 'idea_comment' then (select c.author_id from public.idea_comments c where c.id = v_rep.target_id)
    when 'event' then (select e.author_id from public.events e where e.id = v_rep.target_id)
    when 'listing' then (select b.author_id from public.board_posts b where b.id = v_rep.target_id)
    when 'venue' then (select v.created_by from public.venues v where v.id = v_rep.target_id)
    else null end;
  -- Nobody handles a report about themselves.
  if v_owner is not null and v_owner = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select m.role into v_actor_role from public.memberships m where m.user_id = p_actor and m.college_id = p_college;
  select c.name into v_college_name from public.colleges c where c.id = p_college;

  if p_action = 'hide' then
    -- The reason of the report becomes the removal reason the author is told.
    v_removal := case v_rep.reason
      when 'spam' then 'spam' when 'harassment' then 'harassment' when 'inappropriate' then 'inappropriate'
      when 'scam' then 'scam' else 'other' end;
    if v_rep.target_type = 'announcement' then
      update public.announcements set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'team_post' then
      update public.team_posts set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'profile' then
      update public.memberships set profile_hidden_at = now() where user_id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type in ('idea', 'event', 'listing') then
      -- The same removal as the admin tools: hides it, writes the audit log and tells the author why.
      perform public.content_remove_internal(p_actor, v_actor_role, p_college,
        case v_rep.target_type when 'idea' then 'thought' else v_rep.target_type end,
        v_rep.target_id, v_removal, v_note);
      v_told := true;
    elsif v_rep.target_type = 'idea_comment' then
      update public.ideas set comment_count = greatest(comment_count - 1, 0)
       where id = (select c.idea_id from public.idea_comments c where c.id = v_rep.target_id and c.status = 'published');
      update public.idea_comments set status = 'removed' where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'venue' then
      update public.venues set status = 'hidden' where id = v_rep.target_id and college_id = p_college;
      update public.venue_bookings
         set status = 'declined', manager_note = 'This venue was removed by a moderator.', decided_by = p_actor, decided_at = now()
       where venue_id = v_rep.target_id and status = 'pending';
    else
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    if v_owner is not null and not v_told then
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
-- 2. Feedback
-- ---------------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  college_id uuid references public.colleges (id) on delete set null,
  kind text not null default 'idea',
  message text not null,
  page text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint feedback_kind_valid check (kind in ('idea', 'problem', 'other')),
  constraint feedback_message_length check (char_length(message) between 5 and 1500),
  constraint feedback_page_length check (page is null or char_length(page) <= 200),
  constraint feedback_status_valid check (status in ('new', 'seen', 'done'))
);
create index feedback_status_idx on public.feedback (status, created_at desc);
alter table public.feedback enable row level security;
create policy feedback_no_client_access on public.feedback for select to authenticated using (false);
revoke all on public.feedback from anon, authenticated;

create function public.feedback_create(p_user uuid, p_college uuid, p_kind text, p_message text, p_page text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.feedback;
begin
  if p_user is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if (select count(*) from public.feedback f where f.user_id = p_user and f.created_at > now() - interval '1 day') >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.feedback (user_id, college_id, kind, message, page)
  values (p_user, p_college, p_kind, btrim(p_message), nullif(btrim(coalesce(p_page, '')), ''))
  returning * into v_row;
  return jsonb_build_object('id', v_row.id, 'created_at', v_row.created_at);
end;
$$;

-- The owner dashboard: newest first, optionally one status.
create function public.owner_feedback(p_status text, p_limit int)
returns table (
  id uuid, kind text, message text, page text, status text, created_at timestamptz,
  user_name text, user_email text, college_slug text
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.kind, f.message, f.page, f.status, f.created_at,
         coalesce(pr.display_name, 'Former member'), u.email::text, c.slug
  from public.feedback f
  left join public.profiles pr on pr.user_id = f.user_id
  left join auth.users u on u.id = f.user_id
  left join public.colleges c on c.id = f.college_id
  where p_status is null or f.status = p_status
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

create function public.owner_feedback_set(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('new', 'seen', 'done') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.feedback set status = p_status where id = p_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.feedback_create(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.owner_feedback(text, int) from public, anon, authenticated;
revoke all on function public.owner_feedback_set(uuid, text) from public, anon, authenticated;
grant execute on function public.feedback_create(uuid, uuid, text, text, text) to service_role;
grant execute on function public.owner_feedback(text, int) to service_role;
grant execute on function public.owner_feedback_set(uuid, text) to service_role;
