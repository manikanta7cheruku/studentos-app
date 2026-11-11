-- Migration: like and dislike on comments (R3-D17, decision D-37).
--   A comment on a buzz can be liked or disliked, the same way a buzz can. One vote per person per comment, a vote can be
--   taken back, and every comment answers with its score and my own vote.
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) calls the
-- functions, which check the actor again inside the database.

create table public.idea_comment_votes (
  comment_id uuid not null references public.idea_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id),
  constraint idea_comment_votes_value_valid check (value in (-1, 1))
);
alter table public.idea_comment_votes enable row level security;
create policy idea_comment_votes_no_client_access on public.idea_comment_votes for select to authenticated using (false);
revoke all on public.idea_comment_votes from anon, authenticated;

alter table public.idea_comments add column score integer not null default 0;

-- Same function as before with two more keys (score and my_vote).
create or replace function public.idea_comment_json(p_comment uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'parent_id', c.parent_id,
    'body', c.body,
    'created_at', c.created_at,
    'is_owner', c.author_id = p_actor,
    'score', c.score,
    'my_vote', coalesce((select v.value from public.idea_comment_votes v where v.comment_id = c.id and v.user_id = p_actor), 0),
    'author', jsonb_build_object('user_id', c.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.idea_comments c
  left join public.profiles pr on pr.user_id = c.author_id
  where c.id = p_comment;
$$;

-- Like (1), dislike (-1) or take the vote back (0). Safe to repeat. Answers with the comment.
create function public.idea_comment_vote(p_actor uuid, p_college uuid, p_comment uuid, p_value smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment public.idea_comments;
  v_idea public.ideas;
  v_old smallint;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_value not in (-1, 0, 1) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_comment from public.idea_comments c
   where c.id = p_comment and c.college_id = p_college and c.status = 'published' for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_idea from public.ideas i where i.id = v_comment.idea_id;
  if not found or v_idea.status = 'removed' or not public.idea_can_see(p_actor, v_idea) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select v.value into v_old from public.idea_comment_votes v where v.comment_id = p_comment and v.user_id = p_actor;
  v_old := coalesce(v_old, 0);
  if p_value = 0 then
    delete from public.idea_comment_votes where comment_id = p_comment and user_id = p_actor;
  else
    insert into public.idea_comment_votes (comment_id, user_id, value) values (p_comment, p_actor, p_value)
    on conflict (comment_id, user_id) do update set value = excluded.value;
  end if;
  update public.idea_comments set score = score - v_old + p_value where id = p_comment;
  return public.idea_comment_json(p_comment, p_actor);
end;
$$;

revoke all on function public.idea_comment_vote(uuid, uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.idea_comment_vote(uuid, uuid, uuid, smallint) to service_role;
