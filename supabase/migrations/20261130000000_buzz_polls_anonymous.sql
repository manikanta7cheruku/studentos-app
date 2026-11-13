-- Migration: polls, anonymous posting and a question of the day on Buzz (R3-D28, decisions D-49 and D-50).
--   * A buzz can carry a poll of 2 to 4 options. People pick one, and can change their pick.
--   * A buzz or a comment can be posted anonymously. Other people see "Anonymous <animal>" and a steady alias inside one buzz,
--     so a conversation still makes sense. Moderators and the database keep the real author (reports, removal). Anonymous
--     posts do not count towards the contributions on a profile.
--   * `prompt_key` says a buzz answers the question of the day.
-- Same rule as the earlier tables: closed tables, only the server (service role) calls the functions.

alter table public.ideas
  add column is_anonymous boolean not null default false,
  add column poll_options jsonb,
  add column prompt_key text,
  add constraint ideas_poll_shape check (
    poll_options is null or (
      jsonb_typeof(poll_options) = 'array' and jsonb_array_length(poll_options) between 2 and 4
    )
  ),
  add constraint ideas_prompt_key_length check (prompt_key is null or char_length(prompt_key) <= 40);

alter table public.idea_comments add column is_anonymous boolean not null default false;

create table public.idea_poll_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  option smallint not null check (option between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
alter table public.idea_poll_votes enable row level security;
create policy idea_poll_votes_no_client_access on public.idea_poll_votes for select to authenticated using (false);
revoke all on public.idea_poll_votes from anon, authenticated;

-- "Anonymous fox": the same person always gets the same alias inside one buzz, and a different one in the next.
create function public.anon_alias(p_idea uuid, p_user uuid)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select 'Anonymous ' || (array['fox','owl','otter','panda','tiger','koala','falcon','dolphin','lynx','heron','badger','gecko'])
    [1 + (('x' || substr(md5(p_idea::text || p_user::text), 1, 8))::bit(32)::int & 2147483647) % 12];
$$;

create or replace function public.idea_json(p_idea uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id,
    'title', i.title,
    'body', i.body,
    'topic', i.topic,
    'score', i.score,
    'comment_count', i.comment_count,
    'created_at', i.created_at,
    'is_owner', i.author_id = p_actor,
    'my_vote', coalesce((select v.value from public.idea_votes v where v.idea_id = i.id and v.user_id = p_actor), 0),
    'is_anonymous', i.is_anonymous,
    'prompt_key', i.prompt_key,
    'poll', case when i.poll_options is null then null else jsonb_build_object(
      'options', (
        select jsonb_agg(jsonb_build_object(
          'text', o.t,
          'votes', (select count(*) from public.idea_poll_votes pv where pv.idea_id = i.id and pv.option = o.n - 1)
        ) order by o.n)
        from jsonb_array_elements_text(i.poll_options) with ordinality as o(t, n)
      ),
      'my_option', (select pv.option from public.idea_poll_votes pv where pv.idea_id = i.id and pv.user_id = p_actor),
      'total', (select count(*) from public.idea_poll_votes pv where pv.idea_id = i.id)
    ) end,
    'author', case when i.is_anonymous then
      jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000000', 'display_name',
                         public.anon_alias(i.id, i.author_id), 'headline', null)
    else
      jsonb_build_object('user_id', i.author_id, 'display_name', coalesce(pr.display_name, 'Former member'),
                         'headline', pr.headline)
    end
  )
  from public.ideas i
  left join public.profiles pr on pr.user_id = i.author_id
  where i.id = p_idea;
$$;

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
    'is_anonymous', c.is_anonymous,
    -- The author of the buzz, so a reader can see "the same person" inside an anonymous thread.
    'by_buzz_author', c.author_id = i.author_id,
    'author', case when c.is_anonymous then
      jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000000', 'display_name',
                         public.anon_alias(c.idea_id, c.author_id))
    else
      jsonb_build_object('user_id', c.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
    end
  )
  from public.idea_comments c
  join public.ideas i on i.id = c.idea_id
  left join public.profiles pr on pr.user_id = c.author_id
  where c.id = p_comment;
$$;

-- New buzz: optional poll, anonymous flag and question of the day. The old five argument version goes away so a call by name
-- cannot be ambiguous.
drop function public.idea_create(uuid, uuid, text, text, text);
create function public.idea_create(
  p_actor uuid, p_college uuid, p_title text, p_body text, p_topic text,
  p_anonymous boolean default false, p_poll jsonb default null, p_prompt text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
  v_poll jsonb := null;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_poll is not null and jsonb_typeof(p_poll) = 'array' and jsonb_array_length(p_poll) > 0 then
    if jsonb_array_length(p_poll) not between 2 and 4
       or exists (select 1 from jsonb_array_elements_text(p_poll) as o(t) where char_length(btrim(o.t)) not between 1 and 40) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    v_poll := (select jsonb_agg(btrim(o.t) order by o.n) from jsonb_array_elements_text(p_poll) with ordinality as o(t, n));
  end if;
  -- At most 20 ideas a day per person.
  if (select count(*) from public.ideas t
      where t.author_id = p_actor and t.created_at > now() - interval '1 day') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.ideas (college_id, author_id, title, body, topic, score, is_anonymous, poll_options, prompt_key)
  values (p_college, p_actor, btrim(p_title), btrim(coalesce(p_body, '')), coalesce(p_topic, 'other'), 1,
          coalesce(p_anonymous, false), v_poll, nullif(btrim(coalesce(p_prompt, '')), ''))
  returning * into v_idea;
  insert into public.idea_votes (idea_id, user_id, value) values (v_idea.id, p_actor, 1);
  return public.idea_json(v_idea.id, p_actor);
end;
$$;

-- Pick an option of a poll. Picking again changes the pick. Safe to repeat.
create function public.idea_poll_vote(p_actor uuid, p_college uuid, p_idea uuid, p_option smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_idea from public.ideas i where i.id = p_idea and i.college_id = p_college;
  if not found or not public.idea_can_see(p_actor, v_idea) or v_idea.poll_options is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_option < 0 or p_option >= jsonb_array_length(v_idea.poll_options) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.idea_poll_votes (idea_id, user_id, option) values (p_idea, p_actor, p_option)
  on conflict (idea_id, user_id) do update set option = excluded.option;
  return public.idea_json(p_idea, p_actor);
end;
$$;

-- Comment, optionally anonymous.
drop function public.idea_comment_create(uuid, uuid, uuid, uuid, text);
create function public.idea_comment_create(
  p_actor uuid, p_college uuid, p_idea uuid, p_parent uuid, p_body text, p_anonymous boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
  v_comment public.idea_comments;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_idea from public.ideas i where i.id = p_idea and i.college_id = p_college for update;
  if not found or not public.idea_can_see(p_actor, v_idea) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_parent is not null and not exists (
    select 1 from public.idea_comments c
    where c.id = p_parent and c.idea_id = p_idea and c.parent_id is null and c.status = 'published'
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.idea_comments c
      where c.author_id = p_actor and c.created_at > now() - interval '1 hour') >= 40 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.idea_comments (idea_id, college_id, author_id, parent_id, body, is_anonymous)
  values (p_idea, p_college, p_actor, p_parent, btrim(p_body), coalesce(p_anonymous, false))
  returning * into v_comment;
  update public.ideas set comment_count = comment_count + 1 where id = p_idea;
  return public.idea_comment_json(v_comment.id, p_actor);
end;
$$;

revoke all on function public.anon_alias(uuid, uuid) from public, anon, authenticated;
revoke all on function public.idea_create(uuid, uuid, text, text, text, boolean, jsonb, text) from public, anon, authenticated;
revoke all on function public.idea_poll_vote(uuid, uuid, uuid, smallint) from public, anon, authenticated;
revoke all on function public.idea_comment_create(uuid, uuid, uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.anon_alias(uuid, uuid) to service_role;
grant execute on function public.idea_create(uuid, uuid, text, text, text, boolean, jsonb, text) to service_role;
grant execute on function public.idea_poll_vote(uuid, uuid, uuid, smallint) to service_role;
grant execute on function public.idea_comment_create(uuid, uuid, uuid, uuid, text, boolean) to service_role;
