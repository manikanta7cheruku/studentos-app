-- Migration: message requests, network strength, private debates, a place on the profile, and more owner data
-- (R3-D34 to D-38, decisions D-61 to D-65).
--   1. A first message to someone you have no chat with is a REQUEST. The other person can continue chatting (by writing back),
--      or say not interested (the sender is told, politely, that they are not available right now). A request lasts 3 days.
--      After "not interested" the same person can ask again after 5 days. 10 new requests a day (3 for accounts under 2 days
--      old). Two people who follow each other skip the request.
--   2. Network: a connection is a chat the other person accepted, or two people who follow each other. People to meet are
--      suggested from shared interests, branch, college and mutual connections.
--   3. A debate can be invite only: only the author and the invited people can see it or take part.
--   4. A place the person lives in (optional, city or area).
--   5. Owner dashboard: more of every record, paging, and numbers about debates, requests and connections.
-- Same rule as the earlier tables: closed tables, only the server (service role) calls the functions.

-- ---------------------------------------------------------------------------
-- 0. A place on the profile
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column place text,
  add constraint profiles_place_length check (place is null or char_length(place) between 2 and 80);
grant insert (place) on public.profiles to authenticated;
grant update (place) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Notifications: one more type
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'membership.expired', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn', 'team.post_expired',
  'opportunity.deadline_soon', 'team.joined', 'content.removed',
  'venue.booking_requested', 'venue.booking_confirmed', 'venue.booking_declined', 'venue.booking_cancelled',
  'dm.received', 'debate.invited'
));

-- ---------------------------------------------------------------------------
-- 2. Message requests
-- ---------------------------------------------------------------------------
alter table public.dm_threads
  add column status text not null default 'accepted',
  add column requester_id uuid references auth.users (id) on delete set null,
  add column requested_at timestamptz not null default now(),
  add column request_expires_at timestamptz,
  add column decided_at timestamptz,
  add constraint dm_threads_status_valid check (status in ('pending', 'accepted', 'declined'));
-- Conversations that already exist were between people who both wrote: they stay accepted.
create index dm_threads_requester_idx on public.dm_threads (requester_id, requested_at desc);

-- pending past its time reads as expired. The row is not changed: the clock decides.
create function public.dm_effective(p_thread public.dm_threads)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_thread.status = 'pending' and p_thread.request_expires_at <= now() then 'expired' else p_thread.status end;
$$;

create function public.are_mutual_follows(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.follows f where f.follower_id = a and f.followee_id = b)
     and exists (select 1 from public.follows f where f.follower_id = b and f.followee_id = a);
$$;

-- p_body is the first message (a request) or any later one. Writing back to a request is "continue chatting".
create or replace function public.dm_send(p_actor uuid, p_college uuid, p_to uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread public.dm_threads;
  v_msg public.dm_messages;
  v_name text;
  v_status text;
  v_cap int;
  v_new boolean := false;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  perform public.dm_assert_pair(p_actor, p_college, p_to);
  if (select count(*) from public.dm_messages m where m.sender_id = p_actor and m.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  v_cap := case when (select u.created_at from auth.users u where u.id = p_actor) > now() - interval '2 days' then 3 else 10 end;

  select * into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_to) and t.user_b = greatest(p_actor, p_to) for update;

  if not found then
    if not public.are_mutual_follows(p_actor, p_to) then
      if (select count(*) from public.dm_threads t where t.requester_id = p_actor and t.requested_at > now() - interval '1 day') >= v_cap then
        raise exception 'RATE_LIMITED' using errcode = 'P0001';
      end if;
      v_new := true;
    end if;
    insert into public.dm_threads (college_id, user_a, user_b, status, requester_id, requested_at, request_expires_at)
    values (p_college, least(p_actor, p_to), greatest(p_actor, p_to),
            case when v_new then 'pending' else 'accepted' end, p_actor, now(),
            case when v_new then now() + interval '3 days' else null end)
    returning * into v_thread;
  else
    v_status := public.dm_effective(v_thread);
    if v_status = 'pending' then
      if v_thread.requester_id = p_actor then
        -- One message until they answer.
        raise exception 'CONFLICT' using errcode = 'P0001';
      end if;
      -- The person asked writes back: that is "continue chatting".
      update public.dm_threads set status = 'accepted', decided_at = now(), request_expires_at = null where id = v_thread.id;
    elsif v_status in ('declined', 'expired') then
      if v_thread.requester_id = p_actor then
        -- A new request. After "not interested" it has to wait 5 days.
        if v_status = 'declined' and v_thread.decided_at + interval '5 days' > now() then
          raise exception 'CONFLICT' using errcode = 'P0001';
        end if;
        if (select count(*) from public.dm_threads t where t.requester_id = p_actor and t.requested_at > now() - interval '1 day') >= v_cap then
          raise exception 'RATE_LIMITED' using errcode = 'P0001';
        end if;
        delete from public.dm_messages where thread_id = v_thread.id;
        update public.dm_threads
           set status = 'pending', requested_at = now(), request_expires_at = now() + interval '3 days', decided_at = null
         where id = v_thread.id;
        v_new := true;
      else
        -- The other person writes first after saying no, or after not answering: the door is open.
        update public.dm_threads set status = 'accepted', decided_at = now(), request_expires_at = null where id = v_thread.id;
      end if;
    end if;
  end if;

  -- Someone who does not open their messages cannot be flooded.
  if (select count(*) from public.dm_messages m
       where m.thread_id = v_thread.id and m.sender_id = p_actor and m.opened_at is null and m.expires_at > now()) >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  -- The first message the other person has not yet opened tells them. The ones after it stay quiet.
  if v_new or not exists (select 1 from public.dm_messages m
                  where m.thread_id = v_thread.id and m.sender_id = p_actor and m.opened_at is null and m.expires_at > now()) then
    select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
    perform public.notify_user(p_to, p_college, 'dm.received',
      case when v_new or v_thread.requester_id = p_actor and v_thread.status = 'pending' then 'New request' else 'New message' end,
      coalesce(v_name, 'Someone') || case when v_new then ' wants to connect with you.' else ' sent you a message.' end,
      jsonb_build_object('from', p_actor));
  end if;
  insert into public.dm_messages (thread_id, sender_id, body)
  values (v_thread.id, p_actor, btrim(p_body))
  returning * into v_msg;
  return jsonb_build_object(
    'id', v_msg.id, 'created_at', v_msg.created_at, 'expires_at', v_msg.expires_at,
    'request', v_new
  );
end;
$$;

-- "Not interested": only the person who was asked, only while the request is open. The request message is deleted.
create function public.dm_decline(p_actor uuid, p_college uuid, p_with uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread public.dm_threads;
begin
  perform public.dm_assert_pair(p_actor, p_college, p_with);
  select * into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_with) and t.user_b = greatest(p_actor, p_with) for update;
  if not found or public.dm_effective(v_thread) <> 'pending' or v_thread.requester_id = p_actor then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  delete from public.dm_messages where thread_id = v_thread.id;
  update public.dm_threads set status = 'declined', decided_at = now(), request_expires_at = null where id = v_thread.id;
  return jsonb_build_object('status', 'declined');
end;
$$;

drop function public.dm_inbox(uuid, uuid);
create function public.dm_inbox(p_actor uuid, p_college uuid)
returns table (
  other_id uuid, other_name text, other_avatar_path text, unread int, last_at timestamptz,
  status text, requester_id uuid, request_expires_at timestamptz, decided_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select o.other, coalesce(pr.display_name, 'Former member'), pr.avatar_path,
           (select count(*)::int from public.dm_messages m
             where m.thread_id = t.id and m.sender_id <> p_actor and m.opened_at is null and m.expires_at > now()),
           coalesce((select max(m.created_at) from public.dm_messages m where m.thread_id = t.id and m.expires_at > now()),
                    t.decided_at, t.requested_at),
           public.dm_effective(t), t.requester_id, t.request_expires_at, t.decided_at
    from public.dm_threads t
    cross join lateral (select case when t.user_a = p_actor then t.user_b else t.user_a end as other) o
    left join public.profiles pr on pr.user_id = o.other
    where t.college_id = p_college and p_actor in (t.user_a, t.user_b)
      and not public.is_blocked_between(p_actor, o.other)
      and (
        (public.dm_effective(t) = 'accepted' and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.expires_at > now()))
        or public.dm_effective(t) = 'pending'
        -- The person who asked sees how it ended for 5 days.
        or (public.dm_effective(t) in ('declined', 'expired') and t.requester_id = p_actor
            and coalesce(t.decided_at, t.request_expires_at) > now() - interval '5 days')
      )
    order by 5 desc;
end;
$$;

create or replace function public.dm_thread(p_actor uuid, p_college uuid, p_with uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread public.dm_threads;
  v_status text := 'none';
  v_can boolean := true;
  v_blocked boolean := false;
  v_again timestamptz;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  if p_with is null or p_with = p_actor
     or not exists (select 1 from public.memberships m
                     where m.user_id = p_with and m.college_id = p_college and m.status = 'active') then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(p_actor, p_with) then
    v_blocked := true;
    v_can := false;
  end if;
  select * into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_with) and t.user_b = greatest(p_actor, p_with);
  if found then
    v_status := public.dm_effective(v_thread);
    if v_status = 'pending' and v_thread.requester_id = p_actor then
      v_can := false;                -- waiting for an answer
    elsif v_status = 'declined' and v_thread.requester_id = p_actor and v_thread.decided_at + interval '5 days' > now() then
      v_can := false;                -- has to wait
      v_again := v_thread.decided_at + interval '5 days';
    end if;
  end if;
  if found and not v_blocked then
    if v_status = 'accepted' then
      update public.dm_messages
         set opened_at = now(), expires_at = least(expires_at, now() + interval '1 hour')
       where thread_id = v_thread.id and sender_id <> p_actor and opened_at is null and expires_at > now();
    elsif v_status = 'pending' and v_thread.requester_id <> p_actor then
      -- Reading a request does not start the clock on it: it stays until they answer or it runs out.
      update public.dm_messages set opened_at = now()
       where thread_id = v_thread.id and sender_id <> p_actor and opened_at is null and expires_at > now();
    end if;
  end if;
  return jsonb_build_object(
    'other', (select jsonb_build_object('user_id', pr.user_id, 'display_name', pr.display_name, 'avatar_path', pr.avatar_path,
                                         'headline', pr.headline, 'college_name', pr.college_name, 'branch', pr.branch,
                                         'grad_year', pr.grad_year)
                from public.profiles pr where pr.user_id = p_with),
    'can_message', v_can,
    'request', case when v_status = 'none' or v_status = 'accepted' then null else jsonb_build_object(
        'status', v_status,
        'i_requested', v_thread.requester_id = p_actor,
        'expires_at', v_thread.request_expires_at,
        'can_request_again_at', v_again) end,
    'messages', case when not found or v_blocked then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'mine', m.sender_id = p_actor, 'body', m.body,
               'created_at', m.created_at, 'opened_at', m.opened_at, 'expires_at', m.expires_at)
             order by m.created_at, m.id)
        from public.dm_messages m
       where m.thread_id = v_thread.id and m.expires_at > now()
    ), '[]'::jsonb) end
  );
end;
$$;

-- Empty accepted conversations are kept: they are connections. Only empty requests that ended are cleaned up.
create or replace function public.dm_purge()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.dm_messages where expires_at <= now();
  get diagnostics v_count = row_count;
  delete from public.dm_threads t
   where t.status <> 'accepted'
     and coalesce(t.decided_at, t.request_expires_at, t.requested_at) < now() - interval '7 days'
     and not exists (select 1 from public.dm_messages m where m.thread_id = t.id);
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Network: connections, strength and people to meet
-- ---------------------------------------------------------------------------
-- A connection: a chat the other person accepted, or two people who follow each other.
create function public.network_connections(p_user uuid)
returns table (other uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.other from (
    select case when t.user_a = p_user then t.user_b else t.user_a end as other
    from public.dm_threads t
    where p_user in (t.user_a, t.user_b) and t.status = 'accepted'
    union
    select f1.followee_id
    from public.follows f1
    join public.follows f2 on f2.follower_id = f1.followee_id and f2.followee_id = f1.follower_id
    where f1.follower_id = p_user
  ) c
  join public.profiles pr on pr.user_id = c.other and pr.deleted_at is null
  where not public.is_blocked_between(p_user, c.other);
$$;

create function public.network_stats(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'connections', (select count(*) from public.network_connections(p_user)),
    'requests_sent', (select count(*) from public.dm_threads t
                      where t.requester_id = p_user and public.dm_effective(t) = 'pending'),
    'requests_received', (select count(*) from public.dm_threads t
                          where p_user in (t.user_a, t.user_b) and t.requester_id <> p_user and public.dm_effective(t) = 'pending')
  );
$$;

create function public.network_suggest(p_actor uuid, p_college uuid, p_limit int default 6)
returns table (
  user_id uuid, display_name text, headline text, avatar_path text, college_name text, branch text, grad_year smallint,
  shared_interests text[], mutual int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    with me as (
      select coalesce(p.interests, '{}') || coalesce(p.tech_interests, '{}') as ints, p.branch as branch, p.college_name as college
      from public.profiles p where p.user_id = p_actor
    ),
    mine as (select c.other from public.network_connections(p_actor) c),
    cand as (
      select p.user_id as uid, p.display_name as dn, p.headline as hl, p.avatar_path as ap, p.college_name as cn, p.branch as br,
             p.grad_year as gy, coalesce(p.interests, '{}') || coalesce(p.tech_interests, '{}') as ints
      from public.memberships m
      join public.profiles p on p.user_id = m.user_id
      where m.college_id = p_college and m.status = 'active' and m.profile_hidden_at is null
        and p.visibility = 'college' and p.deleted_at is null and p.user_id <> p_actor
        and not public.is_blocked_between(p_actor, p.user_id)
        and p.user_id not in (select other from mine)
        and not exists (
          select 1 from public.dm_threads t
          where t.college_id = p_college and t.user_a = least(p_actor, p.user_id) and t.user_b = greatest(p_actor, p.user_id)
            and (public.dm_effective(t) in ('pending', 'accepted')
                 or (public.dm_effective(t) = 'declined' and t.requester_id = p_actor))
        )
    ),
    scored as (
      select c.*,
        coalesce((select array_agg(distinct i) from unnest(c.ints) i
                   where lower(i) in (select lower(x) from me, unnest(me.ints) x)), '{}') as shared,
        (select count(*)::int from public.network_connections(c.uid) o where o.other in (select other from mine)) as mut
      from cand c
    )
    select s.uid, s.dn, s.hl, s.ap, s.cn, s.br, s.gy, s.shared, s.mut
    from scored s cross join me
    order by (cardinality(s.shared) * 2 + s.mut * 5
              + case when s.br is not null and s.br = me.branch then 2 else 0 end
              + case when s.cn is not null and s.cn = me.college then 1 else 0 end) desc,
             md5(s.uid::text || current_date::text)
    limit least(greatest(p_limit, 1), 12);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Private debates
-- ---------------------------------------------------------------------------
alter table public.debates
  add column visibility text not null default 'public',
  add constraint debates_visibility_valid check (visibility in ('public', 'invite'));

create table public.debate_invites (
  debate_id uuid not null references public.debates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (debate_id, user_id)
);
create index debate_invites_user_idx on public.debate_invites (user_id);
alter table public.debate_invites enable row level security;
create policy debate_invites_no_client_access on public.debate_invites for select to authenticated using (false);
revoke all on public.debate_invites from anon, authenticated;

create or replace function public.debate_can_see(p_actor uuid, p_debate public.debates)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_debate.status = 'published' and (
    p_debate.author_id = p_actor
    or (
      exists (
        select 1 from public.memberships m
        where m.user_id = p_debate.author_id and m.college_id = p_debate.college_id and m.status = 'active'
      )
      and not public.is_blocked_between(p_actor, p_debate.author_id)
      and (p_debate.visibility = 'public'
           or exists (select 1 from public.debate_invites i where i.debate_id = p_debate.id and i.user_id = p_actor))
    )
  );
$$;

create or replace function public.debate_json(p_debate uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'title', d.title,
    'body', d.body,
    'topic', d.topic,
    'side_a', d.side_a,
    'side_b', d.side_b,
    'created_at', d.created_at,
    'ends_at', d.ends_at,
    'ended', d.ends_at <= now(),
    'a_count', (select count(*) from public.debate_sides s where s.debate_id = d.id and s.side = 0),
    'b_count', (select count(*) from public.debate_sides s where s.debate_id = d.id and s.side = 1),
    'my_side', (select s.side from public.debate_sides s where s.debate_id = d.id and s.user_id = p_actor),
    'argument_count', d.argument_count,
    'is_owner', d.author_id = p_actor,
    'visibility', d.visibility,
    -- Only the author is told how many people were invited.
    'invited_count', case when d.author_id = p_actor then (select count(*) from public.debate_invites i where i.debate_id = d.id) else null end,
    'author', jsonb_build_object('user_id', d.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.debates d
  left join public.profiles pr on pr.user_id = d.author_id
  where d.id = p_debate;
$$;

drop function public.debate_create(uuid, uuid, text, text, text, text, text, int);
create function public.debate_create(
  p_actor uuid, p_college uuid, p_title text, p_body text, p_topic text, p_side_a text, p_side_b text, p_hours int,
  p_visibility text default 'public', p_invites uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
  v_name text;
  v_user uuid;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_hours not in (1, 6, 24, 72, 168)
     or lower(btrim(p_side_a)) = lower(btrim(p_side_b))
     or coalesce(p_visibility, 'public') not in ('public', 'invite')
     or coalesce(cardinality(p_invites), 0) > 50
     or (p_visibility = 'invite' and coalesce(cardinality(p_invites), 0) = 0) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.debates d
      where d.author_id = p_actor and d.created_at > now() - interval '1 day') >= 3 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.debates (college_id, author_id, title, body, topic, side_a, side_b, ends_at, visibility)
  values (p_college, p_actor, btrim(p_title), btrim(coalesce(p_body, '')), coalesce(p_topic, 'other'),
          btrim(p_side_a), btrim(p_side_b), now() + make_interval(hours => p_hours), coalesce(p_visibility, 'public'))
  returning * into v_debate;
  if v_debate.visibility = 'invite' then
    select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
    -- Only active members of this college who have not blocked the author, never the author.
    for v_user in
      select distinct u from unnest(p_invites) u
      where u <> p_actor
        and exists (select 1 from public.memberships m where m.user_id = u and m.college_id = p_college and m.status = 'active')
        and not public.is_blocked_between(p_actor, u)
    loop
      insert into public.debate_invites (debate_id, user_id) values (v_debate.id, v_user) on conflict do nothing;
      perform public.notify_user(v_user, p_college, 'debate.invited', 'You are invited to a debate',
        coalesce(v_name, 'Someone') || ' invited you: ' || left(v_debate.title, 80), jsonb_build_object('debate_id', v_debate.id));
    end loop;
  end if;
  return public.debate_json(v_debate.id, p_actor);
end;
$$;

-- The author invites more people to their invite only debate (50 in all).
create function public.debate_invite_add(p_actor uuid, p_college uuid, p_debate uuid, p_users uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
  v_name text;
  v_user uuid;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_debate from public.debates d where d.id = p_debate and d.college_id = p_college and d.status = 'published' for update;
  if not found or v_debate.author_id <> p_actor then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_debate.visibility <> 'invite' or coalesce(cardinality(p_users), 0) = 0
     or (select count(*) from public.debate_invites i where i.debate_id = p_debate) + cardinality(p_users) > 50 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
  for v_user in
    select distinct u from unnest(p_users) u
    where u <> p_actor
      and exists (select 1 from public.memberships m where m.user_id = u and m.college_id = p_college and m.status = 'active')
      and not public.is_blocked_between(p_actor, u)
      and not exists (select 1 from public.debate_invites i where i.debate_id = p_debate and i.user_id = u)
  loop
    insert into public.debate_invites (debate_id, user_id) values (p_debate, v_user) on conflict do nothing;
    perform public.notify_user(v_user, p_college, 'debate.invited', 'You are invited to a debate',
      coalesce(v_name, 'Someone') || ' invited you: ' || left(v_debate.title, 80), jsonb_build_object('debate_id', p_debate));
  end loop;
  return public.debate_json(p_debate, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. The directory knows the place
-- ---------------------------------------------------------------------------
drop function public.directory_list(uuid, text, int);
create function public.directory_list(p_college uuid, p_q text default null, p_limit int default 100)
returns table (
  user_id uuid, display_name text, handle text, headline text, avatar_path text, interests text[],
  tech_interests text[], college_name text, branch text, grad_year smallint, place text
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select nullif(btrim(coalesce(p_q, '')), '') as raw,
           '%' || replace(replace(replace(btrim(coalesce(p_q, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as like_q
  )
  select p.user_id, p.display_name, p.handle, p.headline, p.avatar_path, p.interests,
         p.tech_interests, p.college_name, p.branch, p.grad_year, p.place
  from public.memberships m
  join public.profiles p on p.user_id = m.user_id
  cross join q
  where m.college_id = p_college
    and m.status = 'active'
    and m.profile_hidden_at is null
    and p.visibility = 'college'
    and p.deleted_at is null
    and p_college in (select public.auth_member_colleges(1))
    and not public.is_blocked_between((select auth.uid()), p.user_id)
    and (
      q.raw is null
      or p.display_name ilike q.like_q
      or p.handle ilike q.like_q
      or p.headline ilike q.like_q
      or p.college_name ilike q.like_q
      or p.branch ilike q.like_q
      or p.place ilike q.like_q
      or exists (select 1 from unnest(p.interests || p.tech_interests) as i where i ilike q.like_q)
    )
  order by lower(p.display_name), p.user_id
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- ---------------------------------------------------------------------------
-- 6. Owner: the whole record, paging, and numbers about debates, requests and connections
-- ---------------------------------------------------------------------------
drop function public.owner_users_full(text, int);
create function public.owner_users_full(p_q text, p_limit int default 100, p_offset int default 0)
returns jsonb
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
  return jsonb_build_object(
    'total', (select count(*) from auth.users u left join public.profiles p on p.user_id = u.id
              where v_q is null or u.email ilike v_like or p.display_name ilike v_like or p.handle ilike v_like
                 or p.college_name ilike v_like or p.branch ilike v_like or p.place ilike v_like),
    'rows', coalesce((
      select jsonb_agg(x.item order by x.created desc)
      from (
        select u.created_at as created, jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'created_at', u.created_at,
          'last_sign_in_at', u.last_sign_in_at,
          'suspended', (u.banned_until is not null and u.banned_until > now()),
          'platform_admin', exists (select 1 from public.platform_admins a where a.user_id = u.id),
          'spaces', coalesce((
            select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'role', m.role, 'status', m.status) order by c.name)
            from public.memberships m join public.colleges c on c.id = m.college_id
            where m.user_id = u.id
          ), '[]'::jsonb),
          'profile', jsonb_build_object(
            'display_name', p.display_name, 'handle', p.handle, 'headline', p.headline, 'bio', p.bio,
            'college_name', p.college_name, 'branch', p.branch, 'grad_year', p.grad_year, 'place', p.place,
            'interests', coalesce(p.interests, '{}'::text[]), 'tech_interests', coalesce(p.tech_interests, '{}'::text[]),
            'excited_by', p.excited_by, 'career_goal', p.career_goal, 'visibility', p.visibility,
            'avatar', p.avatar_path is not null, 'onboarded', (p.handle is not null and p.college_name is not null and p.grad_year is not null)),
          'private', jsonb_build_object(
            'sex', pp.sex, 'sex_public', coalesce(pp.sex_public, false),
            'birth_year', pp.birth_year, 'age_public', coalesce(pp.age_public, false),
            'phone', pp.phone, 'phone_visibility', coalesce(pp.phone_visibility, 'hidden')),
          'counts', public.profile_contributions(u.id)
                    || jsonb_build_object('followers', (select count(*) from public.follows f where f.followee_id = u.id),
                                          'following', (select count(*) from public.follows f where f.follower_id = u.id)),
          'network', public.network_stats(u.id),
          'activity', jsonb_build_object(
            'messages_sent', (select count(*) from public.dm_messages m where m.sender_id = u.id),
            'private_debates', (select count(*) from public.debates d where d.author_id = u.id and d.visibility = 'invite'),
            'skills', (select count(*) from public.user_skills us where us.user_id = u.id),
            'feedback', (select count(*) from public.feedback f where f.user_id = u.id),
            'reports_filed', (select count(*) from public.reports r where r.reporter_id = u.id),
            'reports_against', (select count(*) from public.reports r where r.target_type = 'profile' and r.target_id = u.id))
        ) as item
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        left join public.profile_private pp on pp.user_id = u.id
        where v_q is null
           or u.email ilike v_like or p.display_name ilike v_like or p.handle ilike v_like
           or p.college_name ilike v_like or p.branch ilike v_like or p.place ilike v_like
        order by u.created_at desc
        limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create function public.owner_network_insights()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'debates_total', (select count(*) from public.debates d where d.status = 'published'),
    'debates_live', (select count(*) from public.debates d where d.status = 'published' and d.ends_at > now()),
    'debates_private', (select count(*) from public.debates d where d.status = 'published' and d.visibility = 'invite'),
    'arguments', (select count(*) from public.debate_arguments a where a.status = 'published'),
    'requests_pending', (select count(*) from public.dm_threads t where public.dm_effective(t) = 'pending'),
    'requests_accepted', (select count(*) from public.dm_threads t where t.status = 'accepted' and t.requester_id is not null and t.decided_at is not null),
    'requests_declined', (select count(*) from public.dm_threads t where t.status = 'declined'),
    'requests_expired', (select count(*) from public.dm_threads t where public.dm_effective(t) = 'expired'),
    'follows', (select count(*) from public.follows),
    'mutual_follows', (select count(*) / 2 from public.follows f1 join public.follows f2 on f2.follower_id = f1.followee_id and f2.followee_id = f1.follower_id),
    'with_place', (select count(*) from public.profiles pr where pr.place is not null and pr.deleted_at is null),
    'buzz', (select count(*) from public.ideas i where i.status = 'published'),
    'plans', (select count(*) from public.team_posts t where t.moderation_hidden_at is null)
  );
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.dm_effective(public.dm_threads) from public, anon, authenticated;
revoke all on function public.are_mutual_follows(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dm_decline(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.dm_inbox(uuid, uuid) from public, anon, authenticated;
revoke all on function public.network_connections(uuid) from public, anon, authenticated;
revoke all on function public.network_stats(uuid) from public, anon, authenticated;
revoke all on function public.network_suggest(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.debate_create(uuid, uuid, text, text, text, text, text, int, text, uuid[]) from public, anon, authenticated;
revoke all on function public.debate_invite_add(uuid, uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.owner_users_full(text, int, int) from public, anon, authenticated;
revoke all on function public.owner_network_insights() from public, anon, authenticated;
revoke all on function public.directory_list(uuid, text, int) from public, anon;
grant execute on function public.dm_effective(public.dm_threads) to service_role;
grant execute on function public.are_mutual_follows(uuid, uuid) to service_role;
grant execute on function public.dm_decline(uuid, uuid, uuid) to service_role;
grant execute on function public.dm_inbox(uuid, uuid) to service_role;
grant execute on function public.network_connections(uuid) to service_role;
grant execute on function public.network_stats(uuid) to service_role;
grant execute on function public.network_suggest(uuid, uuid, int) to service_role;
grant execute on function public.debate_create(uuid, uuid, text, text, text, text, text, int, text, uuid[]) to service_role;
grant execute on function public.debate_invite_add(uuid, uuid, uuid, uuid[]) to service_role;
grant execute on function public.owner_users_full(text, int, int) to service_role;
grant execute on function public.owner_network_insights() to service_role;
grant execute on function public.directory_list(uuid, text, int) to authenticated, service_role;
