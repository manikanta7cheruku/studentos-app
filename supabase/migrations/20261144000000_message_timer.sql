-- Migration: messages that disappear after 1 hour, 7 hours or 24 hours (decision D-93).
--   Each conversation has a timer that either person can change (1 hour by default). It is how long a message stays after the other
--   person opens it. Each message keeps the timer it was sent with, so changing it only affects new messages. Each person also has a
--   default that new conversations start with. A message that is never opened still goes after 3 days.
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) reaches the data
-- through the functions below.

alter table public.dm_threads
  add column disappear_minutes int not null default 60,
  add column disappear_set_by uuid references auth.users (id) on delete set null,
  add column disappear_set_at timestamptz,
  add constraint dm_threads_disappear_valid check (disappear_minutes in (60, 420, 1440));

alter table public.dm_messages
  add column ttl_minutes int not null default 60,
  add constraint dm_messages_ttl_valid check (ttl_minutes in (60, 420, 1440));

-- What a person's new conversations start with.
create table public.dm_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_minutes int not null default 60,
  updated_at timestamptz not null default now(),
  constraint dm_settings_minutes_valid check (default_minutes in (60, 420, 1440))
);
alter table public.dm_settings enable row level security;
create policy dm_settings_no_client_access on public.dm_settings for select to authenticated using (false);
revoke all on public.dm_settings from anon, authenticated;

create function public.dm_settings_get(p_user uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.default_minutes from public.dm_settings s where s.user_id = p_user), 60);
$$;

create function public.dm_settings_set(p_user uuid, p_minutes int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_minutes is null or p_minutes not in (60, 420, 1440)
     or not exists (select 1 from public.profiles pr where pr.user_id = p_user and pr.deleted_at is null) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.dm_settings (user_id, default_minutes) values (p_user, p_minutes)
  on conflict (user_id) do update set default_minutes = excluded.default_minutes, updated_at = now();
  return p_minutes;
end;
$$;

-- Either person in a chat that is going can change its timer. It only affects messages sent from now on.
create function public.dm_set_timer(p_actor uuid, p_college uuid, p_with uuid, p_minutes int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread public.dm_threads;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  perform public.dm_assert_pair(p_actor, p_college, p_with);
  if p_minutes is null or p_minutes not in (60, 420, 1440) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_thread from public.dm_threads t
   where t.college_id = p_college and t.user_a = least(p_actor, p_with) and t.user_b = greatest(p_actor, p_with) for update;
  if not found or public.dm_effective(v_thread) <> 'accepted' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if v_thread.disappear_minutes <> p_minutes then
    update public.dm_threads
       set disappear_minutes = p_minutes, disappear_set_by = p_actor, disappear_set_at = now()
     where id = v_thread.id;
  end if;
  return jsonb_build_object(
    'minutes', p_minutes,
    'set_by_me', true,
    'set_by_name', (select pr.display_name from public.profiles pr where pr.user_id = p_actor),
    'set_at', (select t.disappear_set_at from public.dm_threads t where t.id = v_thread.id),
    'can_change', true
  );
end;
$$;

-- A new conversation starts with its creator's default, and each message keeps the timer it was sent with.
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
    insert into public.dm_threads (college_id, user_a, user_b, status, requester_id, requested_at, request_expires_at, disappear_minutes)
    values (p_college, least(p_actor, p_to), greatest(p_actor, p_to),
            case when v_new then 'pending' else 'accepted' end, p_actor, now(),
            case when v_new then now() + interval '3 days' else null end,
            public.dm_settings_get(p_actor))
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
  insert into public.dm_messages (thread_id, sender_id, body, ttl_minutes)
  values (v_thread.id, p_actor, btrim(p_body), v_thread.disappear_minutes)
  returning * into v_msg;
  return jsonb_build_object(
    'id', v_msg.id, 'created_at', v_msg.created_at, 'expires_at', v_msg.expires_at,
    'request', v_new
  );
end;
$$;

-- Opening a conversation starts each message's own clock, and the answer says what the timer is.
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
  v_exists boolean;
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
  v_exists := found;   -- the updates below reset FOUND, so remember it now
  if v_exists then
    v_status := public.dm_effective(v_thread);
    if v_status = 'pending' and v_thread.requester_id = p_actor then
      v_can := false;                -- waiting for an answer
    elsif v_status = 'declined' and v_thread.requester_id = p_actor and v_thread.decided_at + interval '5 days' > now() then
      v_can := false;                -- has to wait
      v_again := v_thread.decided_at + interval '5 days';
    end if;
  end if;
  if v_exists and not v_blocked then
    if v_status = 'accepted' then
      update public.dm_messages
         set opened_at = now(), expires_at = least(expires_at, now() + make_interval(mins => ttl_minutes))
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
    'disappear', jsonb_build_object(
      'minutes', case when v_exists then v_thread.disappear_minutes else public.dm_settings_get(p_actor) end,
      'set_by_me', v_exists and v_thread.disappear_set_by = p_actor,
      'set_by_name', case when v_exists and v_thread.disappear_set_by is not null
                          then (select pr.display_name from public.profiles pr where pr.user_id = v_thread.disappear_set_by) end,
      'set_at', case when v_exists then v_thread.disappear_set_at end,
      'can_change', v_exists and not v_blocked and v_status = 'accepted'),
    'can_message', v_can,
    'request', case when v_status = 'none' or v_status = 'accepted' then null else jsonb_build_object(
        'status', v_status,
        'i_requested', v_thread.requester_id = p_actor,
        'expires_at', v_thread.request_expires_at,
        'can_request_again_at', v_again) end,
    'messages', case when not v_exists or v_blocked then '[]'::jsonb else coalesce((
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

revoke all on function public.dm_settings_get(uuid) from public, anon, authenticated;
revoke all on function public.dm_settings_set(uuid, int) from public, anon, authenticated;
revoke all on function public.dm_set_timer(uuid, uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.dm_settings_get(uuid) to service_role;
grant execute on function public.dm_settings_set(uuid, int) to service_role;
grant execute on function public.dm_set_timer(uuid, uuid, uuid, int) to service_role;
