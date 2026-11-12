-- Migration: the list of people I blocked, and aggregate insights for the owner dashboard (R3-D23, decision D-43).
--   1. A person can see who they blocked and unblock them from Settings.
--   2. The owner dashboard gets numbers about the new profile details (how many finished the tour, how many answered each
--      option, age bands, popular interests, how many shared a number with hosts). Only counts: the owner never sees one
--      person's sex, birth year or number.
-- Same rule as the earlier tables: only the server (service role) calls these functions.

create function public.blocks_list(p_user uuid)
returns table (user_id uuid, display_name text, avatar_path text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, coalesce(pr.display_name, 'Former member'), pr.avatar_path, b.created_at
  from public.blocks b
  left join public.profiles pr on pr.user_id = b.blocked_id
  where b.blocker_id = p_user
  order by b.created_at desc
  limit 200;
$$;

create function public.owner_insights()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select pr.user_id, pr.display_name, pr.handle, pr.interests, pr.tech_interests, pp.sex, pp.birth_year, pp.phone, pp.phone_visibility
    from public.profiles pr
    left join public.profile_private pp on pp.user_id = pr.user_id
    where pr.deleted_at is null
  )
  select jsonb_build_object(
    'users', (select count(*) from p),
    'onboarded', (select count(*) from p
                   where btrim(display_name) <> '' and handle is not null and sex is not null
                     and cardinality(interests) + cardinality(tech_interests) >= 1),
    'sex', jsonb_build_object(
      'woman', (select count(*) from p where sex = 'woman'),
      'man', (select count(*) from p where sex = 'man'),
      'non_binary', (select count(*) from p where sex = 'non_binary'),
      'prefer_not_to_say', (select count(*) from p where sex = 'prefer_not_to_say'),
      'unanswered', (select count(*) from p where sex is null)),
    'age', jsonb_build_object(
      'under_18', (select count(*) from p where birth_year is not null and extract(year from now())::int - birth_year < 18),
      'from_18_to_22', (select count(*) from p where birth_year is not null and extract(year from now())::int - birth_year between 18 and 22),
      'from_23', (select count(*) from p where birth_year is not null and extract(year from now())::int - birth_year >= 23),
      'not_shared', (select count(*) from p where birth_year is null)),
    'with_phone', (select count(*) from p where phone is not null),
    'phone_shared_with_hosts', (select count(*) from p where phone is not null and phone_visibility = 'hosts'),
    'top_interests', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'n', x.n))
      from (select lower(i) as name, count(*) as n from p, unnest(p.interests) as i group by 1 order by 2 desc, 1 limit 8) x
    ), '[]'::jsonb),
    'top_tech', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'n', x.n))
      from (select lower(i) as name, count(*) as n from p, unnest(p.tech_interests) as i group by 1 order by 2 desc, 1 limit 8) x
    ), '[]'::jsonb),
    'feedback_new', (select count(*) from public.feedback f where f.status = 'new'),
    'messages_waiting', (select count(*) from public.dm_messages m where m.expires_at > now()),
    'venues', (select count(*) from public.venues v where v.status = 'active'),
    'bookings_pending', (select count(*) from public.venue_bookings b where b.status = 'pending'),
    'photos', (select count(*) from public.board_posts b where b.photo_path is not null and b.status <> 'removed')
  );
$$;

revoke all on function public.blocks_list(uuid) from public, anon, authenticated;
revoke all on function public.owner_insights() from public, anon, authenticated;
grant execute on function public.blocks_list(uuid) to service_role;
grant execute on function public.owner_insights() to service_role;
