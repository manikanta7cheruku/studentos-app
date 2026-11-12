-- Migration: disappearing direct messages (R3-D21, decision D-41).
--   Two members of the same college can write to each other. Text only, up to 500 characters. A message disappears
--   1 hour after the other person opens it, and 3 days after it was sent if it is never opened. Nothing is kept for
--   longer, so this takes almost no space.
--   Safety: a message needs both people to be active members of one college and not blocked. A person can send 60 an
--   hour and have 20 unopened messages waiting at one person. Reporting a person from a conversation copies the
--   recent messages into the report (that copy is kept by the report, and is the only copy).
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) calls the
-- functions, which check the actor again inside the database.

alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'membership.expired', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn', 'team.post_expired',
  'opportunity.deadline_soon', 'team.joined', 'content.removed',
  'venue.booking_requested', 'venue.booking_confirmed', 'venue.booking_declined', 'venue.booking_cancelled',
  'dm.received'
));

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete cascade,
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One thread for a pair: the smaller id is always user_a.
  constraint dm_threads_order check (user_a < user_b),
  constraint dm_threads_pair_key unique (college_id, user_a, user_b)
);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  expires_at timestamptz not null default (now() + interval '3 days'),
  constraint dm_messages_body_length check (char_length(body) between 1 and 500)
);
create index dm_messages_thread_idx on public.dm_messages (thread_id, created_at);
create index dm_messages_expiry_idx on public.dm_messages (expires_at);
create index dm_messages_sender_idx on public.dm_messages (sender_id, created_at desc);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
create policy dm_threads_no_client_access on public.dm_threads for select to authenticated using (false);
create policy dm_messages_no_client_access on public.dm_messages for select to authenticated using (false);
revoke all on public.dm_threads from anon, authenticated;
revoke all on public.dm_messages from anon, authenticated;

-- Both people must be active members of the college, and neither has blocked the other.
create function public.dm_assert_pair(p_actor uuid, p_college uuid, p_other uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  if p_other is null or p_other = p_actor
     or not exists (select 1 from public.memberships m
                     where m.user_id = p_other and m.college_id = p_college and m.status = 'active') then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(p_actor, p_other) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
end;
$$;

create function public.dm_send(p_actor uuid, p_college uuid, p_to uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread uuid;
  v_msg public.dm_messages;
  v_name text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  perform public.dm_assert_pair(p_actor, p_college, p_to);
  if (select count(*) from public.dm_messages m where m.sender_id = p_actor and m.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.dm_threads (college_id, user_a, user_b)
  values (p_college, least(p_actor, p_to), greatest(p_actor, p_to))
  on conflict (college_id, user_a, user_b) do nothing;
  select t.id into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_to) and t.user_b = greatest(p_actor, p_to);
  -- Someone who does not open their messages cannot be flooded.
  if (select count(*) from public.dm_messages m
       where m.thread_id = v_thread and m.sender_id = p_actor and m.opened_at is null and m.expires_at > now()) >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  -- The first message the other person has not yet opened tells them. The ones after it stay quiet.
  if not exists (select 1 from public.dm_messages m
                  where m.thread_id = v_thread and m.sender_id = p_actor and m.opened_at is null and m.expires_at > now()) then
    select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
    perform public.notify_user(p_to, p_college, 'dm.received', 'New message',
      coalesce(v_name, 'Someone') || ' sent you a message.', jsonb_build_object('from', p_actor));
  end if;
  insert into public.dm_messages (thread_id, sender_id, body)
  values (v_thread, p_actor, btrim(p_body))
  returning * into v_msg;
  return jsonb_build_object('id', v_msg.id, 'created_at', v_msg.created_at, 'expires_at', v_msg.expires_at);
end;
$$;

-- My conversations that still have a message. The words are not shown here, only how many are waiting.
create function public.dm_inbox(p_actor uuid, p_college uuid)
returns table (other_id uuid, other_name text, other_avatar_path text, unread int, last_at timestamptz)
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
           (select max(m.created_at) from public.dm_messages m where m.thread_id = t.id and m.expires_at > now())
    from public.dm_threads t
    cross join lateral (select case when t.user_a = p_actor then t.user_b else t.user_a end as other) o
    left join public.profiles pr on pr.user_id = o.other
    where t.college_id = p_college and p_actor in (t.user_a, t.user_b)
      and not public.is_blocked_between(p_actor, o.other)
      and exists (select 1 from public.dm_messages m where m.thread_id = t.id and m.expires_at > now())
    order by 5 desc;
end;
$$;

-- One conversation. Opening it marks the other person's messages as opened, so they disappear in an hour.
create function public.dm_thread(p_actor uuid, p_college uuid, p_with uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread uuid;
  v_can boolean := true;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  if p_with is null or p_with = p_actor
     or not exists (select 1 from public.memberships m
                     where m.user_id = p_with and m.college_id = p_college and m.status = 'active') then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(p_actor, p_with) then
    v_can := false;
  end if;
  select t.id into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_with) and t.user_b = greatest(p_actor, p_with);
  if v_thread is not null and v_can then
    update public.dm_messages
       set opened_at = now(), expires_at = least(expires_at, now() + interval '1 hour')
     where thread_id = v_thread and sender_id <> p_actor and opened_at is null and expires_at > now();
  end if;
  return jsonb_build_object(
    'other', (select jsonb_build_object('user_id', pr.user_id, 'display_name', pr.display_name, 'avatar_path', pr.avatar_path)
                from public.profiles pr where pr.user_id = p_with),
    'can_message', v_can,
    'messages', case when v_thread is null or not v_can then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'mine', m.sender_id = p_actor, 'body', m.body,
               'created_at', m.created_at, 'opened_at', m.opened_at, 'expires_at', m.expires_at)
             order by m.created_at, m.id)
        from public.dm_messages m
       where m.thread_id = v_thread and m.expires_at > now()
    ), '[]'::jsonb) end
  );
end;
$$;

-- Report the other person from a conversation. The recent messages are copied into the report, because they will be gone.
create function public.dm_report(p_actor uuid, p_college uuid, p_with uuid, p_reason text, p_details text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread uuid;
  v_copy text;
  v_details text;
begin
  perform public.dm_assert_pair(p_actor, p_college, p_with);
  select t.id into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_with) and t.user_b = greatest(p_actor, p_with);
  if v_thread is not null then
    select string_agg((case when x.sender_id = p_actor then 'me: ' else 'them: ' end) || left(x.body, 110), ' | ' order by x.created_at)
      into v_copy
      from (select m.sender_id, m.body, m.created_at from public.dm_messages m
             where m.thread_id = v_thread and m.expires_at > now() order by m.created_at desc limit 6) x;
  end if;
  v_details := left(
    coalesce(nullif(btrim(coalesce(p_details, '')), ''), 'Reported from a conversation.')
      || case when v_copy is null then '' else E'\nMessages: ' || v_copy end,
    1000);
  return public.create_report(p_actor, p_college, 'profile', p_with, p_reason, v_details);
end;
$$;

-- Deletes what has expired. Called by the hourly maintenance job. Safe to run twice.
create function public.dm_purge()
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
   where t.created_at < now() - interval '7 days'
     and not exists (select 1 from public.dm_messages m where m.thread_id = t.id);
  return v_count;
end;
$$;

revoke all on function public.dm_assert_pair(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.dm_send(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.dm_inbox(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dm_thread(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.dm_report(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.dm_purge() from public, anon, authenticated;
grant execute on function public.dm_assert_pair(uuid, uuid, uuid) to service_role;
grant execute on function public.dm_send(uuid, uuid, uuid, text) to service_role;
grant execute on function public.dm_inbox(uuid, uuid) to service_role;
grant execute on function public.dm_thread(uuid, uuid, uuid) to service_role;
grant execute on function public.dm_report(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.dm_purge() to service_role;
