-- Migration: each debate carries its strongest argument, so the card can show a taste of the discussion.

create or replace function public.debate_json(p_debate uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'title', d.title,
    'body', d.body,
    'topic', d.topic,
    'side_a', d.side_a,
    'side_b', d.side_b,
    'created_at', d.created_at,
    'ends_at', d.ends_at,
    'ended', d.ends_at <= now(),
    'a_count', (select count(*) from public.debate_sides s where s.debate_id = d.id and s.side = 0),
    'b_count', (select count(*) from public.debate_sides s where s.debate_id = d.id and s.side = 1),
    'my_side', (select s.side from public.debate_sides s where s.debate_id = d.id and s.user_id = p_actor),
    'argument_count', d.argument_count,
    'is_owner', d.author_id = p_actor,
    'visibility', d.visibility,
    -- The strongest point so far (most strong-point votes, then newest), for a preview on the card. People I blocked are left out.
    'top_argument', (select jsonb_build_object('body', left(a.body, 160), 'side', a.side, 'score', a.score, 'anonymous', a.is_anonymous)
                       from public.debate_arguments a
                      where a.debate_id = d.id and a.status = 'published' and not public.is_blocked_between(p_actor, a.author_id)
                      order by a.score desc, a.created_at desc limit 1),
    -- Only the author is told how many people were invited.
    'invited_count', case when d.author_id = p_actor then (select count(*) from public.debate_invites i where i.debate_id = d.id) else null end,
    'author', jsonb_build_object('user_id', d.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.debates d
  left join public.profiles pr on pr.user_id = d.author_id
  where d.id = p_debate;
$$;
