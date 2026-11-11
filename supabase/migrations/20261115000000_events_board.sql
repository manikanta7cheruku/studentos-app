-- Migration: Events, Lost and found, Marketplace (R3-D12, decision D-33).
--   Events: a title, a start time, a place, an optional capacity, and RSVPs ("going").
--   Board: one table for two boards. Lost and found (kind lost or found) and Marketplace (kind sell, rent, free or
--   wanted, with a price in rupees). Contact is private and in the app: messages between the person who posted and
--   each person who wrote to them. No contact details are shown on a post. Payments are not part of this.
-- Same rule as the earlier tables: RLS is on, the only policies say "no", and only the server (service role) reaches
-- the data through the functions below. Every function checks the actor again inside the database.

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  place text,
  capacity smallint,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_title_length check (char_length(title) between 5 and 120),
  constraint events_description_length check (char_length(description) <= 2000),
  constraint events_place_length check (place is null or char_length(place) between 1 and 120),
  constraint events_capacity_range check (capacity is null or capacity between 1 and 5000),
  constraint events_status_valid check (status in ('published', 'cancelled'))
);
create index events_college_idx on public.events (college_id, status, starts_at);
create index events_author_idx on public.events (author_id, created_at desc);
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Board (lost and found, marketplace)
-- ---------------------------------------------------------------------------
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  board text not null,
  kind text not null,
  title text not null,
  description text not null default '',
  place text,
  price_inr integer,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_posts_board_valid check (board in ('lostfound', 'market')),
  constraint board_posts_kind_valid check (
    (board = 'lostfound' and kind in ('lost', 'found'))
    or (board = 'market' and kind in ('sell', 'rent', 'free', 'wanted'))
  ),
  constraint board_posts_title_length check (char_length(title) between 5 and 120),
  constraint board_posts_description_length check (char_length(description) <= 1500),
  constraint board_posts_place_length check (place is null or char_length(place) between 1 and 120),
  constraint board_posts_price_range check (price_inr is null or price_inr between 0 and 1000000),
  -- Only the market has prices, and a free item has none.
  constraint board_posts_price_rules check (
    (board = 'lostfound' and price_inr is null)
    or (board = 'market' and kind = 'free' and price_inr is null)
    or (board = 'market' and kind in ('sell', 'rent', 'wanted'))
  ),
  constraint board_posts_status_valid check (status in ('open', 'resolved', 'removed'))
);
create index board_posts_feed_idx on public.board_posts (college_id, board, status, created_at desc, id desc);
create index board_posts_author_idx on public.board_posts (author_id, created_at desc);
create trigger board_posts_set_updated_at before update on public.board_posts
  for each row execute function public.set_updated_at();

create table public.board_messages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint board_messages_body_length check (char_length(body) between 1 and 500)
);
create index board_messages_post_idx on public.board_messages (post_id, created_at, id);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.board_posts enable row level security;
alter table public.board_messages enable row level security;
create policy events_no_client_access on public.events for select to authenticated using (false);
create policy event_rsvps_no_client_access on public.event_rsvps for select to authenticated using (false);
create policy board_posts_no_client_access on public.board_posts for select to authenticated using (false);
create policy board_messages_no_client_access on public.board_messages for select to authenticated using (false);
revoke all on public.events from anon, authenticated;
revoke all on public.event_rsvps from anon, authenticated;
revoke all on public.board_posts from anon, authenticated;
revoke all on public.board_messages from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Events: functions
-- ---------------------------------------------------------------------------
create function public.event_json(p_event uuid, p_actor uuid)
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

create function public.event_can_see(p_actor uuid, p_event public.events)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_event.author_id = p_actor or (
    exists (
      select 1 from public.memberships m
      where m.user_id = p_event.author_id and m.college_id = p_event.college_id and m.status = 'active'
    )
    and not public.is_blocked_between(p_actor, p_event.author_id)
  );
$$;

create function public.event_create(
  p_actor uuid, p_college uuid, p_title text, p_description text, p_starts timestamptz, p_place text, p_capacity int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_starts <= now() or p_starts > now() + interval '365 days' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.events t
      where t.author_id = p_actor and t.college_id = p_college and t.status = 'published' and t.starts_at > now()) >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.events (college_id, author_id, title, description, starts_at, place, capacity)
  values (p_college, p_actor, btrim(p_title), btrim(coalesce(p_description, '')), p_starts,
          nullif(btrim(coalesce(p_place, '')), ''), p_capacity)
  returning * into v_event;
  insert into public.event_rsvps (event_id, user_id) values (v_event.id, p_actor);
  return public.event_json(v_event.id, p_actor);
end;
$$;

-- p_when: 'upcoming' (started less than 3 hours ago or later, soonest first) or 'past' (latest first). p_mine: only events I go to.
create function public.event_list(p_actor uuid, p_college uuid, p_when text, p_mine boolean, p_limit int)
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
      where e.college_id = p_college and public.event_can_see(p_actor, e)
        and e.starts_at <= now() - interval '3 hours'
        and (not coalesce(p_mine, false) or exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor))
      order by e.starts_at desc, e.id desc
      limit least(greatest(p_limit, 1), 100);
  else
    return query
      select e.id, public.event_json(e.id, p_actor)
      from public.events e
      where e.college_id = p_college and public.event_can_see(p_actor, e)
        and e.starts_at > now() - interval '3 hours'
        and (not coalesce(p_mine, false) or exists (select 1 from public.event_rsvps r where r.event_id = e.id and r.user_id = p_actor))
      order by e.starts_at asc, e.id asc
      limit least(greatest(p_limit, 1), 100);
  end if;
end;
$$;

create function public.event_get(p_actor uuid, p_college uuid, p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_event from public.events e where e.id = p_event and e.college_id = p_college;
  if not found or not public.event_can_see(p_actor, v_event) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.event_json(p_event, p_actor);
end;
$$;

-- Going or not going. Safe to repeat. A full event answers SLOTS_FULL.
create function public.event_rsvp(p_actor uuid, p_college uuid, p_event uuid, p_going boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_count int;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_event from public.events e where e.id = p_event and e.college_id = p_college for update;
  if not found or not public.event_can_see(p_actor, v_event) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_going then
    if v_event.status <> 'published' or v_event.starts_at <= now() - interval '3 hours' then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.event_rsvps r where r.event_id = p_event and r.user_id = p_actor) then
      select count(*) into v_count from public.event_rsvps r where r.event_id = p_event;
      if v_event.capacity is not null and v_count >= v_event.capacity then
        raise exception 'SLOTS_FULL' using errcode = 'P0001';
      end if;
      insert into public.event_rsvps (event_id, user_id) values (p_event, p_actor);
    end if;
  else
    delete from public.event_rsvps where event_id = p_event and user_id = p_actor;
  end if;
  return public.event_json(p_event, p_actor);
end;
$$;

-- The author, or a moderator or admin, cancels an event.
create function public.event_cancel(p_actor uuid, p_college uuid, p_event uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_event from public.events e where e.id = p_event and e.college_id = p_college;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_event.author_id <> p_actor and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.events set status = 'cancelled' where id = p_event;
  if v_event.author_id <> p_actor then
    perform public.write_audit_log(p_college, p_actor, v_role, 'event.cancelled', 'event', p_event::text,
      jsonb_build_object('title', v_event.title), null);
  end if;
  return public.event_json(p_event, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- Board: functions
-- ---------------------------------------------------------------------------
create function public.board_json(p_post uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'board', b.board,
    'kind', b.kind,
    'title', b.title,
    'description', b.description,
    'place', b.place,
    'price_inr', b.price_inr,
    'status', b.status,
    'created_at', b.created_at,
    'is_owner', b.author_id = p_actor,
    'my_message_count', (select count(*) from public.board_messages m
                          where m.post_id = b.id and (m.from_user = p_actor or m.to_user = p_actor)),
    'author', jsonb_build_object('user_id', b.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.board_posts b
  left join public.profiles pr on pr.user_id = b.author_id
  where b.id = p_post;
$$;

create function public.board_can_see(p_actor uuid, p_post public.board_posts)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_post.status <> 'removed' and (
    p_post.author_id = p_actor or (
      exists (
        select 1 from public.memberships m
        where m.user_id = p_post.author_id and m.college_id = p_post.college_id and m.status = 'active'
      )
      and not public.is_blocked_between(p_actor, p_post.author_id)
    )
  );
$$;

create function public.board_create(
  p_actor uuid, p_college uuid, p_board text, p_kind text, p_title text, p_description text, p_place text, p_price int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if (select count(*) from public.board_posts t
      where t.author_id = p_actor and t.created_at > now() - interval '1 day') >= 15 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.board_posts (college_id, author_id, board, kind, title, description, place, price_inr)
  values (p_college, p_actor, p_board, p_kind, btrim(p_title), btrim(coalesce(p_description, '')),
          nullif(btrim(coalesce(p_place, '')), ''), p_price)
  returning * into v_post;
  return public.board_json(v_post.id, p_actor);
end;
$$;

create function public.board_list(
  p_actor uuid, p_college uuid, p_board text, p_kind text, p_status text, p_mine boolean,
  p_limit int, p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select b.id, b.created_at, public.board_json(b.id, p_actor)
    from public.board_posts b
    where b.college_id = p_college and b.board = p_board
      and public.board_can_see(p_actor, b)
      and (p_kind is null or b.kind = p_kind)
      and (p_status is null or b.status = p_status)
      and (not coalesce(p_mine, false) or b.author_id = p_actor)
      and (p_after_created is null or (b.created_at, b.id) < (p_after_created, p_after_id))
    order by b.created_at desc, b.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create function public.board_get(p_actor uuid, p_college uuid, p_post uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.board_posts b where b.id = p_post and b.college_id = p_college;
  if not found or not public.board_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.board_json(p_post, p_actor);
end;
$$;

-- Only the author. open or resolved (returned, sold or given away).
create function public.board_set_status(p_actor uuid, p_college uuid, p_post uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_status not in ('open', 'resolved') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_post from public.board_posts b where b.id = p_post and b.college_id = p_college and b.author_id = p_actor;
  if not found or v_post.status = 'removed' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  update public.board_posts set status = p_status where id = p_post;
  return public.board_json(p_post, p_actor);
end;
$$;

create function public.board_remove(p_actor uuid, p_college uuid, p_post uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.board_posts b where b.id = p_post and b.college_id = p_college;
  if not found or v_post.status = 'removed' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_post.author_id <> p_actor and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.board_posts set status = 'removed' where id = p_post;
  if v_post.author_id <> p_actor then
    perform public.write_audit_log(p_college, p_actor, v_role, 'board.removed', 'board_post', p_post::text,
      jsonb_build_object('title', v_post.title), null);
  end if;
end;
$$;

-- Private messages. The author sees every thread, with the person each message is with. Anyone else sees only their own thread.
create function public.board_messages_list(p_actor uuid, p_college uuid, p_post uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.board_posts b where b.id = p_post and b.college_id = p_college;
  if not found or not public.board_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'body', m.body,
      'created_at', m.created_at,
      'mine', m.from_user = p_actor,
      'from', jsonb_build_object('user_id', m.from_user, 'display_name', coalesce(pf.display_name, 'Former member')),
      -- The other person of the thread (for the author this is who they are talking to).
      'with_user', jsonb_build_object(
        'user_id', case when m.from_user = v_post.author_id then m.to_user else m.from_user end,
        'display_name', coalesce(po.display_name, 'Former member'))
    ) order by m.created_at, m.id)
    from public.board_messages m
    left join public.profiles pf on pf.user_id = m.from_user
    left join public.profiles po on po.user_id = case when m.from_user = v_post.author_id then m.to_user else m.from_user end
    where m.post_id = p_post
      and (v_post.author_id = p_actor or m.from_user = p_actor or m.to_user = p_actor)
  ), '[]'::jsonb);
end;
$$;

-- A person writes to the author. The author answers one person (p_to) who has written before.
create function public.board_message_send(p_actor uuid, p_college uuid, p_post uuid, p_to uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
  v_to uuid;
  v_message public.board_messages;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_post from public.board_posts b where b.id = p_post and b.college_id = p_college;
  if not found or not public.board_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.status <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if v_post.author_id = p_actor then
    if p_to is null or not exists (
      select 1 from public.board_messages m where m.post_id = p_post and m.from_user = p_to and m.to_user = p_actor
    ) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    v_to := p_to;
  else
    v_to := v_post.author_id;
  end if;
  if (select count(*) from public.board_messages m
      where m.from_user = p_actor and m.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.board_messages (post_id, college_id, from_user, to_user, body)
  values (p_post, p_college, p_actor, v_to, btrim(p_body))
  returning * into v_message;
  return jsonb_build_object('id', v_message.id, 'body', v_message.body, 'created_at', v_message.created_at, 'mine', true,
    'from', jsonb_build_object('user_id', p_actor, 'display_name',
       coalesce((select display_name from public.profiles where user_id = p_actor), 'Former member')),
    'with_user', jsonb_build_object('user_id', v_to, 'display_name',
       coalesce((select display_name from public.profiles where user_id = v_to), 'Former member')));
end;
$$;

revoke all on function public.event_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.event_can_see(uuid, public.events) from public, anon, authenticated;
revoke all on function public.event_create(uuid, uuid, text, text, timestamptz, text, int) from public, anon, authenticated;
revoke all on function public.event_list(uuid, uuid, text, boolean, int) from public, anon, authenticated;
revoke all on function public.event_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.event_rsvp(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.event_cancel(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.board_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.board_can_see(uuid, public.board_posts) from public, anon, authenticated;
revoke all on function public.board_create(uuid, uuid, text, text, text, text, text, int) from public, anon, authenticated;
revoke all on function public.board_list(uuid, uuid, text, text, text, boolean, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.board_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.board_set_status(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.board_remove(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.board_messages_list(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.board_message_send(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.event_create(uuid, uuid, text, text, timestamptz, text, int) to service_role;
grant execute on function public.event_list(uuid, uuid, text, boolean, int) to service_role;
grant execute on function public.event_get(uuid, uuid, uuid) to service_role;
grant execute on function public.event_rsvp(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.event_cancel(uuid, uuid, uuid) to service_role;
grant execute on function public.board_create(uuid, uuid, text, text, text, text, text, int) to service_role;
grant execute on function public.board_list(uuid, uuid, text, text, text, boolean, int, timestamptz, uuid) to service_role;
grant execute on function public.board_get(uuid, uuid, uuid) to service_role;
grant execute on function public.board_set_status(uuid, uuid, uuid, text) to service_role;
grant execute on function public.board_remove(uuid, uuid, uuid) to service_role;
grant execute on function public.board_messages_list(uuid, uuid, uuid) to service_role;
grant execute on function public.board_message_send(uuid, uuid, uuid, uuid, text) to service_role;
