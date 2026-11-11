-- Migration: the functional round (R3-D14, decision D-35).
--   1. Thoughts: a thought needs only some text. Title and topic are optional.
--   2. Plans: open join (one tap) and a list of who joined, and a note to the host for every person who joins.
--   3. Events: official (college admins and moderators, inside a college) or personal (anyone, in Global), and invite only.
--   4. Removing content with a reason: a moderator or admin of a college, or the owner, removes a plan, thought, event or
--      listing and the author is told why.
-- Same rule as the earlier tables: closed to clients, only the server (service role) calls the functions, every function
-- checks the actor again inside the database.

-- ---------------------------------------------------------------------------
-- 1. Thoughts
-- ---------------------------------------------------------------------------
alter table public.ideas drop constraint ideas_title_length;
alter table public.ideas add constraint ideas_title_length check (char_length(title) <= 140);
alter table public.ideas add constraint ideas_has_text check (char_length(btrim(title)) + char_length(btrim(body)) >= 1);

-- ---------------------------------------------------------------------------
-- 2. Notification types for the new notes
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'membership.expired', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn', 'team.post_expired',
  'opportunity.deadline_soon', 'team.joined', 'content.removed'
));

-- ---------------------------------------------------------------------------
-- 3. Plans: open join and participants
-- ---------------------------------------------------------------------------
alter table public.team_posts add column join_mode text not null default 'approval';
alter table public.team_posts add constraint team_posts_join_mode_valid check (join_mode in ('open', 'approval'));

-- Same function as before with one more key (join_mode).
create or replace function public.tf_post_json(p_post uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'kind', p.kind,
    'title', p.title,
    'description', p.description,
    'status', public.tf_shown_status(p.status, p.deadline),
    'deadline', p.deadline,
    'place', p.place,
    'join_mode', p.join_mode,
    'external_link', p.external_link,
    'created_at', p.created_at,
    'is_owner', p.author_id = p_actor,
    'author', jsonb_build_object('user_id', p.author_id, 'display_name', coalesce(pr.display_name, 'Former member')),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'role_name', r.role_name, 'slots', r.slots, 'filled', r.filled,
        'skills', coalesce((select jsonb_agg(s.name order by s.name) from public.team_post_role_skills rs
                            join public.skills s on s.id = rs.skill_id where rs.role_id = r.id), '[]'::jsonb),
        'skill_ids', coalesce((select jsonb_agg(rs.skill_id order by rs.skill_id) from public.team_post_role_skills rs
                               where rs.role_id = r.id), '[]'::jsonb)
      ) order by r.position, r.id)
      from public.team_post_roles r where r.post_id = p.id
    ), '[]'::jsonb),
    'my_requests', coalesce((
      select jsonb_agg(jsonb_build_object('id', j.id, 'role_id', j.role_id, 'status', j.status) order by j.created_at)
      from public.join_requests j where j.post_id = p.id and j.applicant_id = p_actor
    ), '[]'::jsonb)
  )
  from public.team_posts p
  left join public.profiles pr on pr.user_id = p.author_id
  where p.id = p_post;
$$;

create function public.tf_set_join_mode(p_actor uuid, p_post uuid, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_mode not in ('open', 'approval') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.team_posts set join_mode = p_mode where id = p_post and author_id = p_actor;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

-- One tap join for a plan whose host chose open join. The person is in at once, the role count goes up, and the host
-- is told who joined. p_role may be null: the first role that still has room is taken.
create function public.tf_join_open(p_actor uuid, p_college uuid, p_post uuid, p_role uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_role public.team_post_roles;
  v_req public.join_requests;
  v_all_full boolean;
  v_other record;
  v_name text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  -- Lock order: post, then role (the same as the other plan functions).
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college for update;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_post.join_mode <> 'open' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if public.tf_shown_status(v_post.status, v_post.deadline) <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if p_role is null then
    select * into v_role from public.team_post_roles r
     where r.post_id = p_post and r.filled < r.slots order by r.position, r.id limit 1 for update;
    if not found then
      raise exception 'SLOTS_FULL' using errcode = 'P0001';
    end if;
  else
    select * into v_role from public.team_post_roles r where r.id = p_role and r.post_id = p_post for update;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_role.filled >= v_role.slots then
      raise exception 'SLOTS_FULL' using errcode = 'P0001';
    end if;
  end if;
  begin
    insert into public.join_requests (college_id, post_id, role_id, applicant_id, message, status, decided_by, decided_at, decision_note)
    values (p_college, p_post, v_role.id, p_actor, '', 'accepted', v_post.author_id, now(), 'Joined with one tap')
    returning * into v_req;
  exception when unique_violation then
    raise exception 'ALREADY_REQUESTED' using errcode = 'P0001';
  end;
  update public.team_post_roles set filled = filled + 1 where id = v_role.id;
  select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
  v_name := coalesce(v_name, 'Someone');
  perform public.notify_user(v_post.author_id, p_college, 'team.joined', v_name || ' joined your plan',
    v_name || ' joined "' || v_post.title || '".',
    jsonb_build_object('post_id', p_post, 'joiner_id', p_actor, 'joiner_name', v_name));
  select not exists (select 1 from public.team_post_roles r where r.post_id = p_post and r.filled < r.slots) into v_all_full;
  if v_all_full then
    update public.team_posts set status = 'filled' where id = p_post;
    for v_other in
      update public.join_requests j set status = 'cancelled', decided_at = now()
      where j.post_id = p_post and j.status = 'pending'
      returning j.id, j.applicant_id
    loop
      perform public.notify_user(v_other.applicant_id, p_college, 'team.request_cancelled', 'Team is full',
        'The team for "' || v_post.title || '" is full, so your request was cancelled.',
        jsonb_build_object('post_id', p_post, 'request_id', v_other.id));
    end loop;
  end if;
  return public.tf_post_json(p_post, p_actor);
end;
$$;

-- Who is in. Only the host and the people who joined see the list; everyone else gets an empty list (the roles still
-- show how many places are taken).
create function public.tf_participants(p_actor uuid, p_college uuid, p_post uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_in boolean;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  v_in := v_post.author_id = p_actor or exists (
    select 1 from public.join_requests j where j.post_id = p_post and j.applicant_id = p_actor and j.status = 'accepted');
  if not v_in then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(x.item order by x.ord, x.ts), '[]'::jsonb)
    from (
      select 0 as ord, v_post.created_at as ts,
        jsonb_build_object('user_id', v_post.author_id, 'display_name', coalesce(pr.display_name, 'Former member'),
                           'role_name', 'Host', 'joined_at', v_post.created_at, 'is_host', true) as item
      from (select 1) as one
      left join public.profiles pr on pr.user_id = v_post.author_id
      union all
      select 1, coalesce(j.decided_at, j.created_at),
        jsonb_build_object('user_id', j.applicant_id, 'display_name', coalesce(pr.display_name, 'Former member'),
                           'role_name', r.role_name, 'joined_at', coalesce(j.decided_at, j.created_at), 'is_host', false)
      from public.join_requests j
      join public.team_post_roles r on r.id = j.role_id
      left join public.profiles pr on pr.user_id = j.applicant_id
      where j.post_id = p_post and j.status = 'accepted'
    ) x
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Events: official or personal, and invite only
-- ---------------------------------------------------------------------------
alter table public.events add column kind text not null default 'official';
alter table public.events add column invite_only boolean not null default false;
alter table public.events add constraint events_kind_valid check (kind in ('official', 'personal'));
alter table public.events drop constraint events_status_valid;
alter table public.events add constraint events_status_valid check (status in ('published', 'cancelled', 'removed'));

create or replace function public.event_json(p_event uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'starts_at', e.starts_at,
    'place', e.place,
    'capacity', e.capacity,
    'status', e.status,
    'kind', e.kind,
    'invite_only', e.invite_only,
    'going_count', (select count(*) from public.event_rsvps r where r.event_id = e.id),
    'going', exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor),
    'is_owner', e.author_id = p_actor,
    'created_at', e.created_at,
    'author', jsonb_build_object('user_id', e.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.events e
  left join public.profiles pr on pr.user_id = e.author_id
  where e.id = p_event;
$$;

-- A removed event is gone for everyone except its author.
create or replace function public.event_can_see(p_actor uuid, p_event public.events)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_event.author_id = p_actor or (
    p_event.status <> 'removed'
    and exists (
      select 1 from public.memberships m
      where m.user_id = p_event.author_id and m.college_id = p_event.college_id and m.status = 'active'
    )
    and not public.is_blocked_between(p_actor, p_event.author_id)
  );
$$;

drop function public.event_create(uuid, uuid, text, text, timestamptz, text, int);
create function public.event_create(
  p_actor uuid, p_college uuid, p_title text, p_description text, p_starts timestamptz, p_place text, p_capacity int,
  p_invite_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_slug text;
  v_role text;
  v_kind text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select c.slug into v_slug from public.colleges c where c.id = p_college;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  -- Inside a college only its admins and moderators make events (official). In Global anyone can (personal).
  if v_slug <> 'global' and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  v_kind := case when v_slug = 'global' then 'personal' else 'official' end;
  if p_starts <= now() or p_starts > now() + interval '365 days' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.events t
      where t.author_id = p_actor and t.college_id = p_college and t.status = 'published' and t.starts_at > now()) >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.events (college_id, author_id, title, description, starts_at, place, capacity, kind, invite_only)
  values (p_college, p_actor, btrim(p_title), btrim(coalesce(p_description, '')), p_starts,
          nullif(btrim(coalesce(p_place, '')), ''), p_capacity, v_kind, coalesce(p_invite_only, false))
  returning * into v_event;
  insert into public.event_rsvps (event_id, user_id) values (v_event.id, p_actor);
  return public.event_json(v_event.id, p_actor);
end;
$$;

-- Invite only events are not in the list. They are reachable by their link (event_get), by the author, and by people who said they go.
create or replace function public.event_list(p_actor uuid, p_college uuid, p_when text, p_mine boolean, p_limit int)
returns table (id uuid, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  if p_when = 'past' then
    return query
      select e.id, public.event_json(e.id, p_actor)
      from public.events e
      where e.college_id = p_college and public.event_can_see(p_actor, e) and e.status <> 'removed'
        and e.starts_at <= now() - interval '3 hours'
        and (not e.invite_only or e.author_id = p_actor
             or exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor))
        and (not coalesce(p_mine, false) or exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor))
      order by e.starts_at desc, e.id desc
      limit least(greatest(p_limit, 1), 100);
  else
    return query
      select e.id, public.event_json(e.id, p_actor)
      from public.events e
      where e.college_id = p_college and public.event_can_see(p_actor, e) and e.status <> 'removed'
        and e.starts_at > now() - interval '3 hours'
        and (not e.invite_only or e.author_id = p_actor
             or exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor))
        and (not coalesce(p_mine, false) or exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor))
      order by e.starts_at asc, e.id asc
      limit least(greatest(p_limit, 1), 100);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Removing content with a reason
-- ---------------------------------------------------------------------------
-- kind: plan, thought, event or listing. reason: spam, inappropriate, harassment, scam, duplicate or other.
-- The author is told (type content.removed) with the reason. p_college null means "find it": used by the owner.
create function public.content_remove_internal(
  p_actor uuid, p_actor_role text, p_college uuid, p_kind text, p_id uuid, p_reason text, p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_author uuid;
  v_college uuid;
  v_noun text;
  v_label text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_reason not in ('spam', 'inappropriate', 'harassment', 'scam', 'duplicate', 'other') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_kind = 'plan' then
    update public.team_posts set status = 'removed'
     where id = p_id and status <> 'removed' and (p_college is null or college_id = p_college)
    returning title, author_id, college_id into v_title, v_author, v_college;
    v_noun := 'plan';
  elsif p_kind = 'thought' then
    update public.ideas set status = 'removed'
     where id = p_id and status <> 'removed' and (p_college is null or college_id = p_college)
    returning coalesce(nullif(btrim(title), ''), left(body, 60)), author_id, college_id into v_title, v_author, v_college;
    v_noun := 'thought';
  elsif p_kind = 'event' then
    update public.events set status = 'removed'
     where id = p_id and status <> 'removed' and (p_college is null or college_id = p_college)
    returning title, author_id, college_id into v_title, v_author, v_college;
    v_noun := 'event';
  elsif p_kind = 'listing' then
    update public.board_posts set status = 'removed'
     where id = p_id and status <> 'removed' and (p_college is null or college_id = p_college)
    returning title, author_id, college_id into v_title, v_author, v_college;
    v_noun := 'post';
  else
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_author is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  v_label := case p_reason
    when 'spam' then 'It looked like spam.'
    when 'inappropriate' then 'It was not appropriate for StudentOS.'
    when 'harassment' then 'It was hurtful or harassing.'
    when 'scam' then 'It looked like a scam or was unsafe.'
    when 'duplicate' then 'It was a duplicate.'
    else 'It did not follow the rules.' end;
  perform public.write_audit_log(v_college, p_actor, p_actor_role, 'content.removed', p_kind, p_id::text,
    jsonb_build_object('title', v_title, 'reason', p_reason, 'note', v_note), null);
  if v_author <> p_actor then
    perform public.notify_user(v_author, v_college, 'content.removed',
      'Your ' || v_noun || ' was removed',
      '"' || left(v_title, 80) || '" was removed. ' || v_label || coalesce(' ' || v_note, ''),
      jsonb_build_object('kind', p_kind, 'reason', p_reason, 'note', v_note, 'item_title', v_title));
  end if;
end;
$$;

-- A moderator or admin of the college.
create function public.content_remove(p_actor uuid, p_college uuid, p_kind text, p_id uuid, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  perform public.content_remove_internal(p_actor, v_role, p_college, p_kind, p_id, p_reason, p_note);
end;
$$;

-- The owner, in any college.
create function public.owner_content_remove(p_actor uuid, p_kind text, p_id uuid, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.content_remove_internal(p_actor, 'platform_owner', null, p_kind, p_id, p_reason, p_note);
end;
$$;

-- The newest content of a college, for the admin screen.
create function public.content_recent(p_actor uuid, p_college uuid, p_limit int)
returns table (kind text, id uuid, title text, author text, status text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select x.kind, x.id, x.title, x.author, x.status, x.created_at from (
      select 'plan'::text as kind, t.id, t.title, coalesce(p.display_name, '') as author, t.status, t.created_at
        from public.team_posts t left join public.profiles p on p.user_id = t.author_id
        where t.college_id = p_college and t.status <> 'removed'
      union all
      select 'thought', i.id, coalesce(nullif(btrim(i.title), ''), left(i.body, 80)), coalesce(p.display_name, ''), i.status, i.created_at
        from public.ideas i left join public.profiles p on p.user_id = i.author_id
        where i.college_id = p_college and i.status <> 'removed'
      union all
      select 'event', e.id, e.title, coalesce(p.display_name, ''), e.status, e.created_at
        from public.events e left join public.profiles p on p.user_id = e.author_id
        where e.college_id = p_college and e.status <> 'removed'
      union all
      select 'listing', b.id, b.title, coalesce(p.display_name, ''), b.status, b.created_at
        from public.board_posts b left join public.profiles p on p.user_id = b.author_id
        where b.college_id = p_college and b.status <> 'removed'
    ) x
    order by x.created_at desc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

-- The newest content of every college, for the owner screen. p_q matches a title.
create function public.owner_content(p_q text, p_limit int)
returns table (kind text, id uuid, title text, author text, college_slug text, status text, created_at timestamptz)
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
    select x.kind, x.id, x.title, x.author, x.slug, x.status, x.created_at from (
      select 'plan'::text as kind, t.id, t.title, coalesce(p.display_name, '') as author, c.slug, t.status, t.created_at
        from public.team_posts t join public.colleges c on c.id = t.college_id left join public.profiles p on p.user_id = t.author_id
        where t.status <> 'removed'
      union all
      select 'thought', i.id, coalesce(nullif(btrim(i.title), ''), left(i.body, 80)), coalesce(p.display_name, ''), c.slug, i.status, i.created_at
        from public.ideas i join public.colleges c on c.id = i.college_id left join public.profiles p on p.user_id = i.author_id
        where i.status <> 'removed'
      union all
      select 'event', e.id, e.title, coalesce(p.display_name, ''), c.slug, e.status, e.created_at
        from public.events e join public.colleges c on c.id = e.college_id left join public.profiles p on p.user_id = e.author_id
        where e.status <> 'removed'
      union all
      select 'listing', b.id, b.title, coalesce(p.display_name, ''), c.slug, b.status, b.created_at
        from public.board_posts b join public.colleges c on c.id = b.college_id left join public.profiles p on p.user_id = b.author_id
        where b.status <> 'removed'
    ) x
    where v_q is null or x.title ilike v_like
    order by x.created_at desc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

revoke all on function public.tf_set_join_mode(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.tf_join_open(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.tf_participants(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.event_create(uuid, uuid, text, text, timestamptz, text, int, boolean) from public, anon, authenticated;
revoke all on function public.content_remove_internal(uuid, text, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.content_remove(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.owner_content_remove(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.content_recent(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.owner_content(text, int) from public, anon, authenticated;
grant execute on function public.tf_set_join_mode(uuid, uuid, text) to service_role;
grant execute on function public.tf_join_open(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.tf_participants(uuid, uuid, uuid) to service_role;
grant execute on function public.event_create(uuid, uuid, text, text, timestamptz, text, int, boolean) to service_role;
grant execute on function public.content_remove(uuid, uuid, text, uuid, text, text) to service_role;
grant execute on function public.owner_content_remove(uuid, text, uuid, text, text) to service_role;
grant execute on function public.content_recent(uuid, uuid, int) to service_role;
grant execute on function public.owner_content(text, int) to service_role;
