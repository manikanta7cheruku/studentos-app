-- Migration: games at a turf or court (decision D-91).
--   Turf and courts is now about playing, not about booking a ground. A student sets up a game: the sport, the venue and its area,
--   the day and time, how many players are wanted, what each person pays (shown only, nobody pays in the app) and whether anyone
--   can join or the host approves. When the game is full people can still ask: they wait on a list, and the first one in line gets
--   the place when someone drops out. Anyone who joined can say they cannot make it. The host can cancel, and everyone is told.
--   The earlier venue directory and booking tables are left as they are; the app no longer uses them.
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) reaches the data
-- through the functions below. Every function checks the actor again inside the database.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  sport text not null,
  venue text not null,
  area text,
  starts_at timestamptz not null,
  hours smallint not null default 1,
  -- All the players wanted, the host included.
  capacity smallint not null,
  -- Whole rupees each person pays, shown on the game. null or 0 is free.
  price_inr integer,
  join_mode text not null default 'open',
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_sport_length check (char_length(sport) between 2 and 24),
  constraint games_venue_length check (char_length(venue) between 3 and 80),
  constraint games_area_length check (area is null or char_length(area) between 1 and 120),
  constraint games_hours_range check (hours between 1 and 6),
  constraint games_capacity_range check (capacity between 2 and 40),
  constraint games_price_range check (price_inr is null or price_inr between 0 and 100000),
  constraint games_join_mode_valid check (join_mode in ('open', 'approval')),
  constraint games_note_length check (char_length(note) <= 300),
  constraint games_status_valid check (status in ('open', 'cancelled'))
);
create index games_college_idx on public.games (college_id, status, starts_at);
create index games_author_idx on public.games (author_id, starts_at desc);
create trigger games_set_updated_at before update on public.games
  for each row execute function public.set_updated_at();

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- joined: in. requested: waiting for the host. waitlist: the game was full, waiting for a place.
  -- left: said they cannot make it. declined or removed: by the host.
  status text not null,
  -- When the person got into this status. The waiting list is in this order.
  since timestamptz not null default now(),
  primary key (game_id, user_id),
  constraint game_players_status_valid check (status in ('joined', 'requested', 'waitlist', 'left', 'declined', 'removed'))
);
create index game_players_user_idx on public.game_players (user_id, status);

alter table public.games enable row level security;
alter table public.game_players enable row level security;
create policy games_no_client_access on public.games for select to authenticated using (false);
create policy game_players_no_client_access on public.game_players for select to authenticated using (false);
revoke all on public.games from anon, authenticated;
revoke all on public.game_players from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notification types
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'membership.expired', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn', 'team.post_expired',
  'opportunity.deadline_soon', 'team.joined', 'content.removed',
  'venue.booking_requested', 'venue.booking_confirmed', 'venue.booking_declined', 'venue.booking_cancelled',
  'dm.received', 'debate.invited',
  'game.request_received', 'game.player_joined', 'game.accepted', 'game.declined',
  'game.spot_opened', 'game.player_left', 'game.cancelled'
));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- How many are in (joined), waiting for the host (requested) and waiting for a place (waitlist).
create function public.game_counts(p_game uuid)
returns table (joined int, requested int, waitlist int)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) filter (where p.status = 'joined')::int,
         count(*) filter (where p.status = 'requested')::int,
         count(*) filter (where p.status = 'waitlist')::int
  from public.game_players p where p.game_id = p_game;
$$;

create function public.game_json(p_game uuid, p_actor uuid, p_detail boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'sport', g.sport,
    'venue', g.venue,
    'area', g.area,
    'starts_at', g.starts_at,
    'hours', g.hours,
    'capacity', g.capacity,
    'price_inr', g.price_inr,
    'join_mode', g.join_mode,
    'note', g.note,
    'status', g.status,
    'created_at', g.created_at,
    'is_host', g.author_id = p_actor,
    'host', jsonb_build_object(
      'user_id', g.author_id,
      'display_name', coalesce((select pr.display_name from public.profiles pr where pr.user_id = g.author_id), 'A member')
    ),
    'joined_count', c.joined,
    'waitlist_count', c.waitlist,
    'requested_count', case when g.author_id = p_actor then c.requested else 0 end,
    'my_status', (select p.status from public.game_players p
                  where p.game_id = g.id and p.user_id = p_actor and p.status in ('joined', 'requested', 'waitlist')),
    'my_place', (select (select count(*)::int from public.game_players w
                         where w.game_id = g.id and w.status = 'waitlist' and w.since <= m.since)
                 from public.game_players m
                 where m.game_id = g.id and m.user_id = p_actor and m.status = 'waitlist'),
    'players', case when p_detail then coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', p.user_id,
          'display_name', coalesce(pr.display_name, 'A member'),
          'is_host', p.user_id = g.author_id
        ) order by (p.user_id = g.author_id) desc, p.since asc)
        from public.game_players p left join public.profiles pr on pr.user_id = p.user_id
        where p.game_id = g.id and p.status = 'joined'
      ), '[]'::jsonb) else '[]'::jsonb end,
    'requests', case when p_detail and g.author_id = p_actor then coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', p.user_id,
          'display_name', coalesce(pr.display_name, 'A member'),
          'status', p.status,
          'since', p.since
        ) order by (p.status = 'requested') desc, p.since asc)
        from public.game_players p left join public.profiles pr on pr.user_id = p.user_id
        where p.game_id = g.id and p.status in ('requested', 'waitlist')
      ), '[]'::jsonb) else '[]'::jsonb end
  )
  from public.games g
  cross join lateral public.game_counts(g.id) c
  where g.id = p_game;
$$;

-- When a place opens, the first people waiting get it. In an open game they are simply in. In a game the host approves, they
-- become requests for the host to answer. Nothing is promoted into a place that is not free.
create function public.game_promote(p_game uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  c record;
  v_next public.game_players;
  v_name text;
begin
  select * into g from public.games x where x.id = p_game;
  loop
    select * into c from public.game_counts(p_game);
    exit when (g.join_mode = 'open' and c.joined >= g.capacity)
           or (g.join_mode = 'approval' and c.joined + c.requested >= g.capacity);
    select * into v_next from public.game_players p
     where p.game_id = p_game and p.status = 'waitlist' order by p.since asc limit 1 for update;
    exit when not found;
    if g.join_mode = 'open' then
      update public.game_players set status = 'joined', since = now() where game_id = p_game and user_id = v_next.user_id;
      perform public.notify_user(v_next.user_id, g.college_id, 'game.spot_opened',
        'A place opened: you are in',
        'You are now playing ' || g.sport || ' at ' || g.venue || ', ' || to_char(g.starts_at at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') || '.',
        jsonb_build_object('game_id', g.id));
      perform public.notify_user(g.author_id, g.college_id, 'game.player_joined',
        coalesce((select pr.display_name from public.profiles pr where pr.user_id = v_next.user_id), 'Someone') || ' took the open place',
        g.sport || ' at ' || g.venue || ' is full again.',
        jsonb_build_object('game_id', g.id));
    else
      update public.game_players set status = 'requested', since = now() where game_id = p_game and user_id = v_next.user_id;
      select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = v_next.user_id;
      perform public.notify_user(g.author_id, g.college_id, 'game.request_received',
        coalesce(v_name, 'Someone') || ' is next in line',
        'A place opened in ' || g.sport || ' at ' || g.venue || '. Answer the request.',
        jsonb_build_object('game_id', g.id));
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Games
-- ---------------------------------------------------------------------------
create function public.game_create(
  p_actor uuid, p_college uuid, p_sport text, p_venue text, p_area text, p_starts timestamptz,
  p_hours smallint, p_capacity smallint, p_price int, p_mode text, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_starts is null or p_starts < now() or p_starts > now() + interval '90 days' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.games x
      where x.author_id = p_actor and x.college_id = p_college and x.status = 'open'
        and x.starts_at + x.hours * interval '1 hour' > now()) >= 8 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.games (college_id, author_id, sport, venue, area, starts_at, hours, capacity, price_inr, join_mode, note)
  values (p_college, p_actor, lower(btrim(p_sport)), btrim(p_venue), nullif(btrim(coalesce(p_area, '')), ''), p_starts,
          coalesce(p_hours, 1), p_capacity, p_price, coalesce(p_mode, 'open'), btrim(coalesce(p_note, '')))
  returning * into v_game;
  insert into public.game_players (game_id, user_id, status) values (v_game.id, p_actor, 'joined');
  return public.game_json(v_game.id, p_actor, true);
end;
$$;

-- Upcoming games of a space, soonest first. `mine` lists the games I host or am part of (including the ones just played).
create function public.game_list(p_actor uuid, p_college uuid, p_sport text, p_mine boolean, p_limit int)
returns table (id uuid, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select g.id, public.game_json(g.id, p_actor, false)
    from public.games g
    where g.college_id = p_college
      and not public.is_blocked_between(p_actor, g.author_id)
      and (p_sport is null or g.sport = p_sport)
      and case
        when p_mine then
          g.starts_at + g.hours * interval '1 hour' > now() - interval '1 day'
          and exists (select 1 from public.game_players p
                      where p.game_id = g.id and p.user_id = p_actor and p.status in ('joined', 'requested', 'waitlist'))
        else g.status = 'open' and g.starts_at + g.hours * interval '1 hour' > now()
      end
    order by g.starts_at asc, g.id asc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

create function public.game_get(p_actor uuid, p_college uuid, p_game uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_game public.games;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_game from public.games g where g.id = p_game and g.college_id = p_college;
  if not found or public.is_blocked_between(p_actor, v_game.author_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.game_json(v_game.id, p_actor, true);
end;
$$;

-- Join. Open game with a free place: in. Open game that is full: on the waiting list. A game the host approves: a request
-- (or the waiting list when the places are all taken or promised). Asking again changes nothing.
create function public.game_join(p_actor uuid, p_college uuid, p_game uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_row public.game_players;
  c record;
  v_status text;
  v_name text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_game from public.games g where g.id = p_game and g.college_id = p_college for update;
  if not found or public.is_blocked_between(p_actor, v_game.author_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_game.status <> 'open' or v_game.starts_at + v_game.hours * interval '1 hour' <= now() then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  select * into v_row from public.game_players p where p.game_id = p_game and p.user_id = p_actor;
  if found and v_row.status in ('joined', 'requested', 'waitlist') then
    return public.game_json(p_game, p_actor, true);
  end if;
  if found and v_row.status in ('declined', 'removed') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select * into c from public.game_counts(p_game);
  if v_game.join_mode = 'open' then
    v_status := case when c.joined < v_game.capacity then 'joined' else 'waitlist' end;
  else
    v_status := case when c.joined + c.requested < v_game.capacity then 'requested' else 'waitlist' end;
  end if;
  insert into public.game_players (game_id, user_id, status) values (p_game, p_actor, v_status)
  on conflict (game_id, user_id) do update set status = excluded.status, since = now();
  select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
  if v_status = 'joined' then
    perform public.notify_user(v_game.author_id, p_college, 'game.player_joined',
      coalesce(v_name, 'Someone') || ' joined your game',
      v_game.sport || ' at ' || v_game.venue || '.',
      jsonb_build_object('game_id', p_game));
  elsif v_status = 'requested' then
    perform public.notify_user(v_game.author_id, p_college, 'game.request_received',
      coalesce(v_name, 'Someone') || ' asked to join',
      v_game.sport || ' at ' || v_game.venue || '. Answer the request.',
      jsonb_build_object('game_id', p_game));
  end if;
  return public.game_json(p_game, p_actor, true);
end;
$$;

-- Leave: take back a request, leave the waiting list, or say I cannot make it. The host is told when someone who was in drops
-- out, and the first person waiting gets the place. The host cannot leave their own game: they cancel it.
create function public.game_leave(p_actor uuid, p_college uuid, p_game uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_row public.game_players;
  v_name text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_game from public.games g where g.id = p_game and g.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_game.author_id = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select * into v_row from public.game_players p where p.game_id = p_game and p.user_id = p_actor for update;
  if not found or v_row.status not in ('joined', 'requested', 'waitlist') then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  update public.game_players set status = 'left', since = now() where game_id = p_game and user_id = p_actor;
  if v_row.status = 'joined' and v_game.status = 'open' then
    select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
    perform public.notify_user(v_game.author_id, p_college, 'game.player_left',
      coalesce(v_name, 'Someone') || ' cannot make it',
      v_game.sport || ' at ' || v_game.venue || ' has a place open.',
      jsonb_build_object('game_id', p_game));
  end if;
  if v_game.status = 'open' then
    perform public.game_promote(p_game);
  end if;
  return public.game_json(p_game, p_actor, true);
end;
$$;

-- The host answers a request or a person on the waiting list: accepted, declined, or (for someone who is in) removed.
create function public.game_decide(p_actor uuid, p_college uuid, p_game uuid, p_user uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_row public.game_players;
  c record;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_game from public.games g where g.id = p_game and g.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_game.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_game.status <> 'open' or p_decision not in ('accepted', 'declined', 'removed') or p_user = p_actor then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  select * into v_row from public.game_players p where p.game_id = p_game and p.user_id = p_user for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_decision = 'accepted' then
    if v_row.status not in ('requested', 'waitlist') then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
    select * into c from public.game_counts(p_game);
    -- The host may take someone from the waiting list when a place is free. When it is not, they raise the number or decline.
    if c.joined >= v_game.capacity then
      raise exception 'SLOTS_FULL' using errcode = 'P0001';
    end if;
    update public.game_players set status = 'joined', since = now() where game_id = p_game and user_id = p_user;
    perform public.notify_user(p_user, p_college, 'game.accepted', 'You are in',
      'You are playing ' || v_game.sport || ' at ' || v_game.venue || ', ' || to_char(v_game.starts_at at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') || '.',
      jsonb_build_object('game_id', p_game));
  elsif p_decision = 'declined' then
    if v_row.status not in ('requested', 'waitlist') then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
    update public.game_players set status = 'declined', since = now() where game_id = p_game and user_id = p_user;
    perform public.notify_user(p_user, p_college, 'game.declined', 'Not this time',
      'The host could not fit you into ' || v_game.sport || ' at ' || v_game.venue || '.',
      jsonb_build_object('game_id', p_game));
  else
    if v_row.status <> 'joined' then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
    update public.game_players set status = 'removed', since = now() where game_id = p_game and user_id = p_user;
    perform public.notify_user(p_user, p_college, 'game.declined', 'Removed from the game',
      'The host removed you from ' || v_game.sport || ' at ' || v_game.venue || '.',
      jsonb_build_object('game_id', p_game));
  end if;
  perform public.game_promote(p_game);
  return public.game_json(p_game, p_actor, true);
end;
$$;

-- The host cancels. Everyone who was in or waiting is told.
create function public.game_cancel(p_actor uuid, p_college uuid, p_game uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games;
  v_row record;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_game from public.games g where g.id = p_game and g.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_game.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_game.status <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.games set status = 'cancelled' where id = p_game;
  for v_row in
    select p.user_id from public.game_players p
    where p.game_id = p_game and p.user_id <> p_actor and p.status in ('joined', 'requested', 'waitlist')
  loop
    perform public.notify_user(v_row.user_id, p_college, 'game.cancelled', 'Game cancelled',
      v_game.sport || ' at ' || v_game.venue || ', ' || to_char(v_game.starts_at at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') || ' was cancelled by the host.',
      jsonb_build_object('game_id', p_game));
  end loop;
  return public.game_json(p_game, p_actor, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Only the server (service role) calls these.
-- ---------------------------------------------------------------------------
revoke all on function public.game_counts(uuid) from public, anon, authenticated;
revoke all on function public.game_json(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.game_promote(uuid) from public, anon, authenticated;
revoke all on function public.game_create(uuid, uuid, text, text, text, timestamptz, smallint, smallint, int, text, text) from public, anon, authenticated;
revoke all on function public.game_list(uuid, uuid, text, boolean, int) from public, anon, authenticated;
revoke all on function public.game_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.game_join(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.game_leave(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.game_decide(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.game_cancel(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.game_counts(uuid) to service_role;
grant execute on function public.game_json(uuid, uuid, boolean) to service_role;
grant execute on function public.game_promote(uuid) to service_role;
grant execute on function public.game_create(uuid, uuid, text, text, text, timestamptz, smallint, smallint, int, text, text) to service_role;
grant execute on function public.game_list(uuid, uuid, text, boolean, int) to service_role;
grant execute on function public.game_get(uuid, uuid, uuid) to service_role;
grant execute on function public.game_join(uuid, uuid, uuid) to service_role;
grant execute on function public.game_leave(uuid, uuid, uuid) to service_role;
grant execute on function public.game_decide(uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.game_cancel(uuid, uuid, uuid) to service_role;
