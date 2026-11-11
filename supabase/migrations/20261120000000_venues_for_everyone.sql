-- Migration: any member can add a venue (R3-D18, decision D-38).
--   Before, inside a college only its admins and moderators could add a turf or court (in Global anyone could). Every other
--   thing a student can start (a plan, a buzz, a listing) is open to any member, so a venue is too. The person who adds a
--   venue still manages its booking requests, and so do the admins and moderators of the college, who can also hide it.
-- The function keeps its name and arguments (and its grants); only the role check is gone.

create or replace function public.venue_create(
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
begin
  perform public.tf_assert_member(p_actor, p_college, true);
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
