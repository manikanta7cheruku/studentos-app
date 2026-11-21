-- Migration: connections count towards Standing, and the welcome tour asks for less (decision D-90).
--   1. `profile_contributions` also returns `connections`, the people I am connected to. The level is still worked out in the
--      app from these counts, so the points can change without another migration.
--   2. A friend "who finished the tour" no longer needs a graduation year: the tour now asks only for a name, a username, the
--      college and the interests. Everything else is filled in later from "Finish your profile".

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
                  and pr.college_name is not null
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
    -- People I am connected to: a chat they accepted, or two people who follow each other. Blocked and deleted people never count.
    'connections', (select count(*) from public.network_connections(p_user)),
    'member_days', coalesce((select greatest(extract(day from now() - pr.created_at), 0)::int
                             from public.profiles pr where pr.user_id = p_user), 0)
  );
$$;

revoke all on function public.profile_contributions(uuid) from public, anon, authenticated;
grant execute on function public.profile_contributions(uuid) to service_role;
