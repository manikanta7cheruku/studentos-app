-- Migration: private follower lists and college name suggestions (R3-D32, decisions D-56 and D-57).
--   1. Who follows whom is private. A person sees their own followers and the people they follow, and nobody else sees either
--      list or the counts (other people's profiles only tell the viewer whether they follow that person).
--   2. College names are typed by people, so the app suggests names that already exist (the colleges on the platform and what
--      other people typed), which keeps spellings the same and discourages made-up values.
-- Same rule as the earlier tables: only the server (service role) calls these functions.

-- p_kind: 'followers' (people who follow p_user) or 'following' (people p_user follows). Newest first. Blocked people and
-- people who left are not listed.
create function public.follow_list(p_user uuid, p_kind text, p_limit int default 100)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', x.uid, 'display_name', coalesce(pr.display_name, 'Former member'), 'headline', pr.headline,
      'avatar_path', pr.avatar_path, 'since', x.created_at) order by x.created_at desc), '[]'::jsonb)
  from (
    select case when p_kind = 'followers' then f.follower_id else f.followee_id end as uid, f.created_at
    from public.follows f
    where (p_kind = 'followers' and f.followee_id = p_user)
       or (p_kind = 'following' and f.follower_id = p_user)
    order by f.created_at desc
    limit least(greatest(p_limit, 1), 200)
  ) x
  join public.profiles pr on pr.user_id = x.uid and pr.deleted_at is null
  where not public.is_blocked_between(p_user, x.uid);
$$;

-- Names that start with, or contain, the typed text. The colleges on the platform first, then what people typed (most used
-- first, spelling merged by letter case). Never more than 8.
create function public.college_name_suggest(p_q text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select '%' || replace(replace(replace(btrim(coalesce(p_q, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as like_q
  ),
  names as (
    select c.name as name, 1000000 as weight
    from public.colleges c, q
    where c.status = 'active' and c.name ilike q.like_q
    union all
    select min(pr.college_name) as name, count(*) as weight
    from public.profiles pr, q
    where pr.college_name is not null and pr.deleted_at is null and pr.college_name ilike q.like_q
    group by lower(pr.college_name)
  )
  select coalesce(jsonb_agg(t.name order by t.weight desc, t.name), '[]'::jsonb)
  from (
    select n.name, n.weight
    from (select distinct on (lower(name)) name, weight from names order by lower(name), weight desc) n
    order by n.weight desc, n.name
    limit 8
  ) t
  where char_length(btrim(coalesce(p_q, ''))) >= 2;
$$;

revoke all on function public.follow_list(uuid, text, int) from public, anon, authenticated;
revoke all on function public.college_name_suggest(text) from public, anon, authenticated;
grant execute on function public.follow_list(uuid, text, int) to service_role;
grant execute on function public.college_name_suggest(text) to service_role;
