-- Migration: turf and court booking (R3-D16, decision D-36).
--   A venue directory (a turf, a court, a ground) and booking requests. A student asks for a day and some hours. The person
--   who manages the venue confirms or declines by hand, and the student is told. No payments (they come later).
--   Who adds a venue: inside a college its admins and moderators, in Global anyone. The person who adds it manages it, and
--   so do the admins and moderators of that college.
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) reaches the data
-- through the functions below. Every function checks the actor again inside the database.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  sports text[] not null,
  area text,
  price_inr_per_hour integer,
  open_hour smallint not null default 6,
  close_hour smallint not null default 23,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_name_length check (char_length(name) between 3 and 80),
  constraint venues_description_length check (char_length(description) <= 600),
  constraint venues_sports_count check (cardinality(sports) between 1 and 5),
  constraint venues_area_length check (area is null or char_length(area) between 1 and 160),
  constraint venues_price_range check (price_inr_per_hour is null or price_inr_per_hour between 0 and 100000),
  constraint venues_hours_valid check (open_hour between 0 and 23 and close_hour between 1 and 24 and open_hour < close_hour),
  constraint venues_status_valid check (status in ('active', 'hidden'))
);
create index venues_college_idx on public.venues (college_id, status, name);
create index venues_creator_idx on public.venues (created_by, created_at desc);
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

create table public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  requester_id uuid not null references auth.users (id) on delete cascade,
  play_date date not null,
  start_hour smallint not null,
  hours smallint not null,
  players smallint,
  note text not null default '',
  status text not null default 'pending',
  manager_note text,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_bookings_start_range check (start_hour between 0 and 23),
  constraint venue_bookings_hours_range check (hours between 1 and 4 and start_hour + hours <= 24),
  constraint venue_bookings_players_range check (players is null or players between 1 and 40),
  constraint venue_bookings_note_length check (char_length(note) <= 300),
  constraint venue_bookings_manager_note_length check (manager_note is null or char_length(manager_note) <= 300),
  constraint venue_bookings_status_valid check (status in ('pending', 'confirmed', 'declined', 'cancelled'))
);
create index venue_bookings_venue_idx on public.venue_bookings (venue_id, play_date, status);
create index venue_bookings_requester_idx on public.venue_bookings (requester_id, play_date desc);
create trigger venue_bookings_set_updated_at before update on public.venue_bookings
  for each row execute function public.set_updated_at();

alter table public.venues enable row level security;
alter table public.venue_bookings enable row level security;
create policy venues_no_client_access on public.venues for select to authenticated using (false);
create policy venue_bookings_no_client_access on public.venue_bookings for select to authenticated using (false);
revoke all on public.venues from anon, authenticated;
revoke all on public.venue_bookings from anon, authenticated;

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
  'venue.booking_requested', 'venue.booking_confirmed', 'venue.booking_declined', 'venue.booking_cancelled'
));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Who manages a venue: the person who added it, and the admins and moderators of its college.
create function public.venue_can_manage(p_actor uuid, p_venue public.venues)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and (
    p_venue.created_by = p_actor
    or exists (
      select 1 from public.memberships m
      where m.user_id = p_actor and m.college_id = p_venue.college_id and m.status = 'active'
        and m.role in ('moderator', 'college_admin')
    )
  );
$$;

create function public.venue_json(p_venue uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id,
    'name', v.name,
    'description', v.description,
    'sports', to_jsonb(v.sports),
    'area', v.area,
    'price_inr_per_hour', v.price_inr_per_hour,
    'open_hour', v.open_hour,
    'close_hour', v.close_hour,
    'status', v.status,
    'created_at', v.created_at,
    'manager', coalesce((select pr.display_name from public.profiles pr where pr.user_id = v.created_by), 'A member'),
    'is_manager', public.venue_can_manage(p_actor, v),
    'pending_count', case when public.venue_can_manage(p_actor, v)
      then (select count(*)::int from public.venue_bookings b where b.venue_id = v.id and b.status = 'pending')
      else 0 end
  )
  from public.venues v where v.id = p_venue;
$$;

create function public.booking_json(p_booking uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'venue_id', b.venue_id,
    'venue_name', v.name,
    'play_date', b.play_date,
    'start_hour', b.start_hour,
    'hours', b.hours,
    'players', b.players,
    'note', b.note,
    'status', b.status,
    'manager_note', b.manager_note,
    'created_at', b.created_at,
    'requester', jsonb_build_object(
      'user_id', b.requester_id,
      'display_name', coalesce((select pr.display_name from public.profiles pr where pr.user_id = b.requester_id), 'A member')
    )
  )
  from public.venue_bookings b join public.venues v on v.id = b.venue_id
  where b.id = p_booking;
$$;

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
create function public.venue_create(
  p_actor uuid, p_college uuid, p_name text, p_description text, p_sports text[], p_area text,
  p_price int, p_open smallint, p_close smallint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
  v_slug text;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select c.slug into v_slug from public.colleges c where c.id = p_college;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  -- Inside a college only its admins and moderators add venues. In Global anyone can.
  if v_slug <> 'global' and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if (select count(*) from public.venues x where x.created_by = p_actor and x.college_id = p_college and x.status = 'active') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.venues (college_id, created_by, name, description, sports, area, price_inr_per_hour, open_hour, close_hour)
  values (p_college, p_actor, btrim(p_name), btrim(coalesce(p_description, '')), p_sports,
          nullif(btrim(coalesce(p_area, '')), ''), p_price, coalesce(p_open, 6), coalesce(p_close, 23))
  returning * into v_venue;
  return public.venue_json(v_venue.id, p_actor);
end;
$$;

create function public.venue_list(p_actor uuid, p_college uuid, p_sport text, p_limit int)
returns table (id uuid, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select v.id, public.venue_json(v.id, p_actor)
    from public.venues v
    where v.college_id = p_college and v.status = 'active'
      and (p_sport is null or p_sport = any (v.sports))
    order by v.name asc, v.id asc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

create function public.venue_get(p_actor uuid, p_college uuid, p_venue uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_venue from public.venues v where v.id = p_venue and v.college_id = p_college and v.status = 'active';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.venue_json(v_venue.id, p_actor);
end;
$$;

-- Hide a venue (its manager). Waiting requests are declined and the people are told.
create function public.venue_hide(p_actor uuid, p_college uuid, p_venue uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
  v_row record;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_venue from public.venues v where v.id = p_venue and v.college_id = p_college and v.status = 'active' for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.venue_can_manage(p_actor, v_venue) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.venues set status = 'hidden' where id = p_venue;
  for v_row in
    with declined as (
      update public.venue_bookings b
         set status = 'declined', manager_note = 'This venue is not taking bookings anymore.', decided_by = p_actor, decided_at = now()
       where b.venue_id = p_venue and b.status = 'pending'
      returning b.id, b.requester_id
    )
    select d.id, d.requester_id from declined d
  loop
    perform public.notify_user(v_row.requester_id, p_college, 'venue.booking_declined',
      'Booking not available',
      v_venue.name || ' is not taking bookings anymore.',
      jsonb_build_object('booking_id', v_row.id, 'venue_id', p_venue));
  end loop;
  return jsonb_build_object('id', p_venue, 'status', 'hidden');
end;
$$;

-- The hours of one day: free, or booked (a confirmed request covers it). Also how many requests wait on each hour,
-- and whether one of them is mine.
create function public.venue_slots(p_actor uuid, p_college uuid, p_venue uuid, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_venue from public.venues v where v.id = p_venue and v.college_id = p_college and v.status = 'active';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 60 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'hour', h.hour,
      'state', case when exists (
          select 1 from public.venue_bookings b
          where b.venue_id = p_venue and b.play_date = p_date and b.status = 'confirmed'
            and h.hour >= b.start_hour and h.hour < b.start_hour + b.hours
        ) then 'booked' else 'free' end,
      'requests', (
          select count(*)::int from public.venue_bookings b
          where b.venue_id = p_venue and b.play_date = p_date and b.status = 'pending'
            and h.hour >= b.start_hour and h.hour < b.start_hour + b.hours
        ),
      'mine', exists (
          select 1 from public.venue_bookings b
          where b.venue_id = p_venue and b.play_date = p_date and b.requester_id = p_actor
            and b.status in ('pending', 'confirmed')
            and h.hour >= b.start_hour and h.hour < b.start_hour + b.hours
        )
    ) order by h.hour)
    from generate_series(v_venue.open_hour, v_venue.close_hour - 1) as h (hour)
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create function public.booking_request(
  p_actor uuid, p_college uuid, p_venue uuid, p_date date, p_start smallint, p_hours smallint, p_players smallint, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
  v_booking public.venue_bookings;
  v_name text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_venue from public.venues v where v.id = p_venue and v.college_id = p_college and v.status = 'active' for share;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 30
     or p_hours is null or p_hours not between 1 and 4
     or p_start is null or p_start < v_venue.open_hour or p_start + p_hours > v_venue.close_hour then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.venue_bookings b
    where b.venue_id = p_venue and b.play_date = p_date and b.status = 'confirmed'
      and p_start < b.start_hour + b.hours and b.start_hour < p_start + p_hours
  ) then
    raise exception 'SLOTS_FULL' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.venue_bookings b
    where b.venue_id = p_venue and b.requester_id = p_actor and b.play_date = p_date and b.status in ('pending', 'confirmed')
      and p_start < b.start_hour + b.hours and b.start_hour < p_start + p_hours
  ) then
    raise exception 'ALREADY_REQUESTED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.venue_bookings b
      where b.requester_id = p_actor and b.college_id = p_college and b.status = 'pending') >= 6 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.venue_bookings (venue_id, college_id, requester_id, play_date, start_hour, hours, players, note)
  values (p_venue, p_college, p_actor, p_date, p_start, p_hours, p_players, btrim(coalesce(p_note, '')))
  returning * into v_booking;
  if v_venue.created_by <> p_actor then
    select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
    perform public.notify_user(v_venue.created_by, p_college, 'venue.booking_requested',
      coalesce(v_name, 'Someone') || ' asked to book ' || v_venue.name,
      coalesce(v_name, 'Someone') || ' wants ' || to_char(p_date, 'Dy DD Mon') || ', ' || lpad(p_start::text, 2, '0') || ':00 for ' || p_hours || ' h.',
      jsonb_build_object('booking_id', v_booking.id, 'venue_id', p_venue));
  end if;
  return public.booking_json(v_booking.id);
end;
$$;

create function public.booking_list_mine(p_actor uuid, p_college uuid, p_limit int)
returns table (id uuid, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select b.id, public.booking_json(b.id)
    from public.venue_bookings b
    where b.college_id = p_college and b.requester_id = p_actor
    order by b.play_date desc, b.start_hour desc, b.id desc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

create function public.booking_list_venue(p_actor uuid, p_college uuid, p_venue uuid, p_status text, p_limit int)
returns table (id uuid, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_venue from public.venues v where v.id = p_venue and v.college_id = p_college;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.venue_can_manage(p_actor, v_venue) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select b.id, public.booking_json(b.id)
    from public.venue_bookings b
    where b.venue_id = p_venue and (p_status is null or b.status = p_status)
    order by (b.status = 'pending') desc, b.play_date asc, b.start_hour asc, b.id asc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

create function public.booking_decide(p_actor uuid, p_college uuid, p_booking uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.venue_bookings;
  v_venue public.venues;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_decision not in ('confirmed', 'declined') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_booking from public.venue_bookings b where b.id = p_booking and b.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_venue from public.venues v where v.id = v_booking.venue_id;
  if not public.venue_can_manage(p_actor, v_venue) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_booking.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if p_decision = 'confirmed' and exists (
    select 1 from public.venue_bookings b
    where b.venue_id = v_booking.venue_id and b.play_date = v_booking.play_date and b.status = 'confirmed' and b.id <> v_booking.id
      and v_booking.start_hour < b.start_hour + b.hours and b.start_hour < v_booking.start_hour + v_booking.hours
  ) then
    raise exception 'SLOTS_FULL' using errcode = 'P0001';
  end if;
  update public.venue_bookings
     set status = p_decision, manager_note = v_note, decided_by = p_actor, decided_at = now()
   where id = p_booking;
  perform public.notify_user(v_booking.requester_id, p_college,
    case when p_decision = 'confirmed' then 'venue.booking_confirmed' else 'venue.booking_declined' end,
    case when p_decision = 'confirmed' then 'Booking confirmed: ' || v_venue.name else 'Booking not available: ' || v_venue.name end,
    to_char(v_booking.play_date, 'Dy DD Mon') || ', ' || lpad(v_booking.start_hour::text, 2, '0') || ':00 for ' || v_booking.hours || ' h. '
      || case when p_decision = 'confirmed' then 'See you there.' else 'Try another time.' end || coalesce(' ' || v_note, ''),
    jsonb_build_object('booking_id', p_booking, 'venue_id', v_booking.venue_id));
  return public.booking_json(p_booking);
end;
$$;

-- The person who asked cancels (a waiting or a confirmed request). The manager is told about a confirmed one.
create function public.booking_cancel(p_actor uuid, p_college uuid, p_booking uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.venue_bookings;
  v_venue public.venues;
  v_name text;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_booking from public.venue_bookings b where b.id = p_booking and b.college_id = p_college for update;
  if not found or v_booking.requester_id <> p_actor then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.venue_bookings set status = 'cancelled' where id = p_booking;
  if v_booking.status = 'confirmed' then
    select * into v_venue from public.venues v where v.id = v_booking.venue_id;
    select coalesce(pr.display_name, 'Someone') into v_name from public.profiles pr where pr.user_id = p_actor;
    if v_venue.created_by <> p_actor then
      perform public.notify_user(v_venue.created_by, p_college, 'venue.booking_cancelled',
        coalesce(v_name, 'Someone') || ' cancelled a booking',
        v_venue.name || ', ' || to_char(v_booking.play_date, 'Dy DD Mon') || ', ' || lpad(v_booking.start_hour::text, 2, '0') || ':00 is free again.',
        jsonb_build_object('booking_id', p_booking, 'venue_id', v_booking.venue_id));
    end if;
  end if;
  return public.booking_json(p_booking);
end;
$$;

-- ---------------------------------------------------------------------------
-- Only the server (service role) calls these.
-- ---------------------------------------------------------------------------
revoke all on function public.venue_can_manage(uuid, public.venues) from public, anon, authenticated;
revoke all on function public.venue_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.booking_json(uuid) from public, anon, authenticated;
revoke all on function public.venue_create(uuid, uuid, text, text, text[], text, int, smallint, smallint) from public, anon, authenticated;
revoke all on function public.venue_list(uuid, uuid, text, int) from public, anon, authenticated;
revoke all on function public.venue_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.venue_hide(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.venue_slots(uuid, uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.booking_request(uuid, uuid, uuid, date, smallint, smallint, smallint, text) from public, anon, authenticated;
revoke all on function public.booking_list_mine(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.booking_list_venue(uuid, uuid, uuid, text, int) from public, anon, authenticated;
revoke all on function public.booking_decide(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.booking_cancel(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.venue_can_manage(uuid, public.venues) to service_role;
grant execute on function public.venue_json(uuid, uuid) to service_role;
grant execute on function public.booking_json(uuid) to service_role;
grant execute on function public.venue_create(uuid, uuid, text, text, text[], text, int, smallint, smallint) to service_role;
grant execute on function public.venue_list(uuid, uuid, text, int) to service_role;
grant execute on function public.venue_get(uuid, uuid, uuid) to service_role;
grant execute on function public.venue_hide(uuid, uuid, uuid) to service_role;
grant execute on function public.venue_slots(uuid, uuid, uuid, date) to service_role;
grant execute on function public.booking_request(uuid, uuid, uuid, date, smallint, smallint, smallint, text) to service_role;
grant execute on function public.booking_list_mine(uuid, uuid, int) to service_role;
grant execute on function public.booking_list_venue(uuid, uuid, uuid, text, int) to service_role;
grant execute on function public.booking_decide(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.booking_cancel(uuid, uuid, uuid) to service_role;
