-- Migration: a standing that has to be earned, and a better Network directory (R3-D33, decisions D-59 and D-60).
--   1. Contributions measure what other people got from you, not how much you posted. `profile_contributions` now also counts
--      the hard-to-fake things: debates that drew a crowd, plans that filled, events that drew a crowd, and friends who really
--      finished joining. The level and the badges are worked out in the app from these numbers and the days as a member.
--   2. The directory (the Network page) also returns the college, branch, year and tech interests, and its search looks at the
--      name, username, headline, college, branch and interests, not only the name.

create or replace function public.profile_contributions(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'buzz', (select count(*) from public.ideas i where i.author_id = p_user and i.status = 'published' and not i.is_anonymous),
    'replies', (select count(*) from public.idea_comments c
                where c.author_id = p_user and c.status = 'published' and not c.is_anonymous),
    'plans', (select count(*) from public.team_posts t where t.author_id = p_user and t.moderation_hidden_at is null),
    'events', (select count(*) from public.events ev where ev.author_id = p_user and ev.status = 'published'),
    -- Upvotes other people gave (one per person per item). The author's own starting vote on a buzz is not counted.
    'upvotes', coalesce((select sum(greatest(i.score - 1, 0)) from public.ideas i
                         where i.author_id = p_user and i.status = 'published' and not i.is_anonymous), 0)
             + coalesce((select sum(greatest(c.score, 0)) from public.idea_comments c
                         where c.author_id = p_user and c.status = 'published' and not c.is_anonymous), 0)
             + coalesce((select sum(a.score) from public.debate_arguments a
                         where a.author_id = p_user and a.status = 'published' and not a.is_anonymous), 0),
    'debates', (select count(*) from public.debates d where d.author_id = p_user and d.status = 'published')
             + (select count(*) from public.debate_arguments a
                where a.author_id = p_user and a.status = 'published' and not a.is_anonymous),
    -- Friends who came through the invite link AND finished the welcome tour.
    'invited', (select count(*) from public.referrals r
                join public.profiles pr on pr.user_id = r.invitee_id
                where r.inviter_id = p_user and pr.deleted_at is null and pr.handle is not null
                  and pr.college_name is not null and pr.grad_year is not null
                  and cardinality(pr.interests) + cardinality(pr.tech_interests) >= 1),
    -- A debate someone started that drew at least 8 people.
    'crowd_debates', (select count(*) from public.debates d
                      where d.author_id = p_user and d.status = 'published'
                        and (select count(*) from public.debate_sides s where s.debate_id = d.id) >= 8),
    -- A plan where at least 3 people were accepted.
    'filled_plans', (select count(*) from public.team_posts t
                     where t.author_id = p_user and t.moderation_hidden_at is null
                       and (select count(*) from public.join_requests j where j.post_id = t.id and j.status = 'accepted') >= 3),
    -- An event where at least 8 people said they were going.
    'big_events', (select count(*) from public.events ev
                   where ev.author_id = p_user and ev.status = 'published'
                     and (select count(*) from public.event_rsvps r where r.event_id = ev.id) >= 8),
    'member_days', coalesce((select greatest(extract(day from now() - pr.created_at), 0)::int
                             from public.profiles pr where pr.user_id = p_user), 0)
  );
$$;

-- The directory: the same rows as before, with the study details and the search widened.
drop function public.directory_list(uuid, text, int);
create function public.directory_list(p_college uuid, p_q text default null, p_limit int default 100)
returns table (
  user_id uuid, display_name text, handle text, headline text, avatar_path text, interests text[],
  tech_interests text[], college_name text, branch text, grad_year smallint
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
         p.tech_interests, p.college_name, p.branch, p.grad_year
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
      or exists (select 1 from unnest(p.interests || p.tech_interests) as i where i ilike q.like_q)
    )
  order by lower(p.display_name), p.user_id
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke all on function public.directory_list(uuid, text, int) from public, anon;
grant execute on function public.directory_list(uuid, text, int) to authenticated, service_role;
