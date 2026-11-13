-- Migration: topic debates replace the weekly challenge (R3-D31, decisions D-54 and D-55).
--   * Anyone can start a debate on a topic (movies, sports, tech, campus, politics, music, food or anything else): a question, two
--     sides and an end time (1 hour to 7 days). People pick a side, post arguments under it, and upvote the strong ones.
--     When the end time passes the debate closes by itself (nothing runs for that: the state is worked out from the clock) and
--     the winning side is the one more people chose.
--   * Debates and arguments can be reported like everything else, and a moderator can hide them.
--   * The weekly challenge never reached a hosted database, so its tables and functions are dropped, and the contributions
--     on a profile count debates instead of challenges.
-- Same rule as the earlier tables: closed tables, only the server (service role) calls the functions.

-- ---------------------------------------------------------------------------
-- 1. The weekly challenge goes
-- ---------------------------------------------------------------------------
drop function if exists public.challenge_applaud(uuid, uuid, boolean);
drop function if exists public.challenge_list(uuid, text, int);
drop function if exists public.challenge_submit(uuid, text, text);
drop function if exists public.challenge_entry_json(uuid, uuid);
drop table if exists public.challenge_applause;
drop table if exists public.challenge_entries;

-- ---------------------------------------------------------------------------
-- 2. Debates
-- ---------------------------------------------------------------------------
create table public.debates (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  topic text not null default 'other',
  side_a text not null,
  side_b text not null,
  ends_at timestamptz not null,
  status text not null default 'published',
  argument_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint debates_title_length check (char_length(title) between 5 and 140),
  constraint debates_body_length check (char_length(body) <= 600),
  constraint debates_topic_valid check (topic in ('movies', 'sports', 'tech', 'campus', 'politics', 'music', 'food', 'other')),
  constraint debates_sides_length check (char_length(side_a) between 1 and 30 and char_length(side_b) between 1 and 30),
  constraint debates_status_valid check (status in ('published', 'removed')),
  constraint debates_ends_after_start check (ends_at > created_at)
);
create index debates_college_idx on public.debates (college_id, status, created_at desc, id desc);
create index debates_ends_idx on public.debates (college_id, ends_at);
create index debates_author_idx on public.debates (author_id, created_at desc);

-- Which side each person chose (0 is side A, 1 is side B). A person may change while the debate is live.
create table public.debate_sides (
  debate_id uuid not null references public.debates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  side smallint not null check (side in (0, 1)),
  updated_at timestamptz not null default now(),
  primary key (debate_id, user_id)
);

create table public.debate_arguments (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  side smallint not null check (side in (0, 1)),
  body text not null,
  is_anonymous boolean not null default false,
  score integer not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint debate_arguments_body_length check (char_length(body) between 1 and 600),
  constraint debate_arguments_status_valid check (status in ('published', 'removed'))
);
create index debate_arguments_debate_idx on public.debate_arguments (debate_id, status, score desc, created_at);
create index debate_arguments_author_idx on public.debate_arguments (author_id);

-- "Strong point": one upvote a person per argument.
create table public.debate_argument_votes (
  argument_id uuid not null references public.debate_arguments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (argument_id, user_id)
);

alter table public.debates enable row level security;
alter table public.debate_sides enable row level security;
alter table public.debate_arguments enable row level security;
alter table public.debate_argument_votes enable row level security;
create policy debates_no_client_access on public.debates for select to authenticated using (false);
create policy debate_sides_no_client_access on public.debate_sides for select to authenticated using (false);
create policy debate_arguments_no_client_access on public.debate_arguments for select to authenticated using (false);
create policy debate_argument_votes_no_client_access on public.debate_argument_votes for select to authenticated using (false);
revoke all on public.debates from anon, authenticated;
revoke all on public.debate_sides from anon, authenticated;
revoke all on public.debate_arguments from anon, authenticated;
revoke all on public.debate_argument_votes from anon, authenticated;

create function public.debate_json(p_debate uuid, p_actor uuid)
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
    'author', jsonb_build_object('user_id', d.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.debates d
  left join public.profiles pr on pr.user_id = d.author_id
  where d.id = p_debate;
$$;

-- Published, by a person still active in the college, and not blocked either way.
create function public.debate_can_see(p_actor uuid, p_debate public.debates)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_debate.status = 'published' and (
    p_debate.author_id = p_actor
    or (
      exists (
        select 1 from public.memberships m
        where m.user_id = p_debate.author_id and m.college_id = p_debate.college_id and m.status = 'active'
      )
      and not public.is_blocked_between(p_actor, p_debate.author_id)
    )
  );
$$;

-- p_hours: 1, 6, 24, 72 or 168. Three debates a day per person.
create function public.debate_create(
  p_actor uuid, p_college uuid, p_title text, p_body text, p_topic text, p_side_a text, p_side_b text, p_hours int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_hours not in (1, 6, 24, 72, 168)
     or lower(btrim(p_side_a)) = lower(btrim(p_side_b)) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.debates d
      where d.author_id = p_actor and d.created_at > now() - interval '1 day') >= 3 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.debates (college_id, author_id, title, body, topic, side_a, side_b, ends_at)
  values (p_college, p_actor, btrim(p_title), btrim(coalesce(p_body, '')), coalesce(p_topic, 'other'),
          btrim(p_side_a), btrim(p_side_b), now() + make_interval(hours => p_hours))
  returning * into v_debate;
  return public.debate_json(v_debate.id, p_actor);
end;
$$;

-- p_status: 'live', 'ended' or 'all'. Newest first, with a cursor.
create function public.debate_list(
  p_actor uuid, p_college uuid, p_status text, p_topic text, p_limit int,
  p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select d.id, d.created_at, public.debate_json(d.id, p_actor)
    from public.debates d
    where d.college_id = p_college
      and public.debate_can_see(p_actor, d)
      and (coalesce(p_status, 'all') = 'all'
           or (p_status = 'live' and d.ends_at > now())
           or (p_status = 'ended' and d.ends_at <= now()))
      and (p_topic is null or d.topic = p_topic)
      and (p_after_created is null or (d.created_at, d.id) < (p_after_created, p_after_id))
    order by d.created_at desc, d.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create function public.debate_get(p_actor uuid, p_college uuid, p_debate uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_debate from public.debates d where d.id = p_debate and d.college_id = p_college;
  if not found or not public.debate_can_see(p_actor, v_debate) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.debate_json(p_debate, p_actor);
end;
$$;

-- Choose a side (0 or 1), or change it. Only while the debate is live (CONFLICT after it ended).
create function public.debate_pick_side(p_actor uuid, p_college uuid, p_debate uuid, p_side smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_debate from public.debates d where d.id = p_debate and d.college_id = p_college;
  if not found or not public.debate_can_see(p_actor, v_debate) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_side not in (0, 1) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_debate.ends_at <= now() then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  insert into public.debate_sides (debate_id, user_id, side) values (p_debate, p_actor, p_side)
  on conflict (debate_id, user_id) do update set side = excluded.side, updated_at = now();
  return public.debate_json(p_debate, p_actor);
end;
$$;

create function public.debate_argument_json(p_argument uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'side', a.side,
    'body', a.body,
    'created_at', a.created_at,
    'is_owner', a.author_id = p_actor,
    'score', a.score,
    'i_upvoted', exists (select 1 from public.debate_argument_votes v where v.argument_id = a.id and v.user_id = p_actor),
    'is_anonymous', a.is_anonymous,
    'by_debate_author', a.author_id = d.author_id,
    'author', case when a.is_anonymous then
      jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000000', 'display_name', public.anon_alias(a.debate_id, a.author_id))
    else
      jsonb_build_object('user_id', a.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
    end
  )
  from public.debate_arguments a
  join public.debates d on d.id = a.debate_id
  left join public.profiles pr on pr.user_id = a.author_id
  where a.id = p_argument;
$$;

-- Post an argument under the side I chose. Only while the debate is live. 30 an hour.
create function public.debate_argue(p_actor uuid, p_college uuid, p_debate uuid, p_body text, p_anonymous boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
  v_side smallint;
  v_argument public.debate_arguments;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_debate from public.debates d where d.id = p_debate and d.college_id = p_college for update;
  if not found or not public.debate_can_see(p_actor, v_debate) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_debate.ends_at <= now() then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  select s.side into v_side from public.debate_sides s where s.debate_id = p_debate and s.user_id = p_actor;
  if v_side is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.debate_arguments x
      where x.author_id = p_actor and x.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.debate_arguments (debate_id, college_id, author_id, side, body, is_anonymous)
  values (p_debate, p_college, p_actor, v_side, btrim(p_body), coalesce(p_anonymous, false))
  returning * into v_argument;
  update public.debates set argument_count = argument_count + 1 where id = p_debate;
  return public.debate_argument_json(v_argument.id, p_actor);
end;
$$;

-- Every argument, the strongest first (then oldest first). People I blocked, or who blocked me, are left out.
create function public.debate_argument_list(p_actor uuid, p_college uuid, p_debate uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_debate from public.debates d where d.id = p_debate and d.college_id = p_college;
  if not found or not public.debate_can_see(p_actor, v_debate) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return coalesce((
    select jsonb_agg(public.debate_argument_json(a.id, p_actor) order by a.score desc, a.created_at, a.id)
    from public.debate_arguments a
    where a.debate_id = p_debate and a.status = 'published'
      and not public.is_blocked_between(p_actor, a.author_id)
  ), '[]'::jsonb);
end;
$$;

-- "Strong point": upvote (p_on true) or take it back. Not your own. Only while the debate is live.
create function public.debate_argument_vote(p_actor uuid, p_college uuid, p_argument uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_argument public.debate_arguments;
  v_debate public.debates;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_argument from public.debate_arguments a
   where a.id = p_argument and a.college_id = p_college and a.status = 'published';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_debate from public.debates d where d.id = v_argument.debate_id;
  if not public.debate_can_see(p_actor, v_debate) or public.is_blocked_between(p_actor, v_argument.author_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_argument.author_id = p_actor then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_debate.ends_at <= now() then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if p_on then
    insert into public.debate_argument_votes (argument_id, user_id) values (p_argument, p_actor) on conflict do nothing;
  else
    delete from public.debate_argument_votes where argument_id = p_argument and user_id = p_actor;
  end if;
  update public.debate_arguments
     set score = (select count(*) from public.debate_argument_votes v where v.argument_id = p_argument)
   where id = p_argument;
  return public.debate_argument_json(p_argument, p_actor);
end;
$$;

-- The author, or a moderator or admin (written to the audit log), removes a debate or an argument.
create function public.debate_remove(p_actor uuid, p_college uuid, p_debate uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_debate public.debates;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_debate from public.debates d where d.id = p_debate and d.college_id = p_college;
  if not found or v_debate.status = 'removed' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_debate.author_id <> p_actor and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.debates set status = 'removed' where id = p_debate;
  if v_debate.author_id <> p_actor then
    perform public.write_audit_log(p_college, p_actor, v_role, 'debate.removed', 'debate', p_debate::text,
      jsonb_build_object('title', v_debate.title), null);
  end if;
end;
$$;

create function public.debate_argument_remove(p_actor uuid, p_college uuid, p_argument uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_argument public.debate_arguments;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_argument from public.debate_arguments a where a.id = p_argument and a.college_id = p_college;
  if not found or v_argument.status = 'removed' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_argument.author_id <> p_actor and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.debate_arguments set status = 'removed' where id = p_argument;
  update public.debates set argument_count = greatest(argument_count - 1, 0) where id = v_argument.debate_id;
  if v_argument.author_id <> p_actor then
    perform public.write_audit_log(p_college, p_actor, v_role, 'debate_argument.removed', 'debate_argument', p_argument::text,
      jsonb_build_object('body', left(v_argument.body, 80)), null);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Contributions: debates instead of challenges
-- ---------------------------------------------------------------------------
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
    -- Upvotes other people gave. The author's own starting vote on a buzz is not counted.
    'upvotes', coalesce((select sum(greatest(i.score - 1, 0)) from public.ideas i
                         where i.author_id = p_user and i.status = 'published' and not i.is_anonymous), 0)
             + coalesce((select sum(greatest(c.score, 0)) from public.idea_comments c
                         where c.author_id = p_user and c.status = 'published' and not c.is_anonymous), 0)
             + coalesce((select sum(a.score) from public.debate_arguments a
                         where a.author_id = p_user and a.status = 'published' and not a.is_anonymous), 0),
    -- Debates started, and arguments made (never anonymous ones).
    'debates', (select count(*) from public.debates d where d.author_id = p_user and d.status = 'published')
             + (select count(*) from public.debate_arguments a
                where a.author_id = p_user and a.status = 'published' and not a.is_anonymous),
    'invited', (select count(*) from public.referrals r where r.inviter_id = p_user)
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Reports and moderation reach debates too
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint reports_target_type_valid;
alter table public.reports add constraint reports_target_type_valid check (
  target_type in ('profile', 'project', 'team_post', 'announcement', 'idea', 'idea_comment', 'event', 'listing', 'venue',
                  'debate', 'debate_argument')
);

create or replace function public.create_report(
  p_actor uuid, p_college uuid, p_target_type text, p_target uuid, p_reason text, p_details text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.reports;
begin
  if p_actor is null or not exists (
    select 1 from public.memberships m
    where m.user_id = p_actor and m.college_id = p_college and m.status = 'active' and m.verification_level >= 1
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.colleges c where c.id = p_college and c.status in ('suspended', 'archived')) then
    raise exception 'TENANT_SUSPENDED' using errcode = 'P0001';
  end if;

  if p_target_type = 'announcement' then
    if not exists (
      select 1 from public.announcements a
      where a.id = p_target and a.college_id = p_college and a.status <> 'removed'
    ) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'profile' then
    if p_target = p_actor then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.memberships m
      where m.user_id = p_target and m.college_id = p_college and m.status = 'active'
    ) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'team_post' then
    if not exists (
      select 1 from public.team_posts t
      where t.id = p_target and t.college_id = p_college and t.status <> 'removed'
    ) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.team_posts t where t.id = p_target and t.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'idea' then
    if not exists (select 1 from public.ideas i where i.id = p_target and i.college_id = p_college and i.status <> 'removed') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.ideas i where i.id = p_target and i.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'idea_comment' then
    if not exists (select 1 from public.idea_comments c where c.id = p_target and c.college_id = p_college and c.status = 'published') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.idea_comments c where c.id = p_target and c.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'event' then
    if not exists (select 1 from public.events e where e.id = p_target and e.college_id = p_college and e.status <> 'removed') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.events e where e.id = p_target and e.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'listing' then
    if not exists (select 1 from public.board_posts b where b.id = p_target and b.college_id = p_college and b.status <> 'removed') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.board_posts b where b.id = p_target and b.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'venue' then
    if not exists (select 1 from public.venues v where v.id = p_target and v.college_id = p_college and v.status = 'active') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.venues v where v.id = p_target and v.created_by = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'debate' then
    if not exists (select 1 from public.debates d where d.id = p_target and d.college_id = p_college and d.status = 'published') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.debates d where d.id = p_target and d.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  elsif p_target_type = 'debate_argument' then
    if not exists (select 1 from public.debate_arguments a where a.id = p_target and a.college_id = p_college and a.status = 'published') then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.debate_arguments a where a.id = p_target and a.author_id = p_actor) then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  else
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  begin
    insert into public.reports (college_id, reporter_id, target_type, target_id, reason, details)
    values (p_college, p_actor, p_target_type, p_target, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
    returning * into v_report;
  exception when unique_violation then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end;

  return jsonb_build_object('id', v_report.id, 'status', v_report.status, 'created_at', v_report.created_at);
end;
$$;

create or replace function public.mod_list_reports(
  p_actor uuid, p_college uuid, p_status text, p_limit int,
  p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (
  id uuid, target_type text, target_id uuid, target_title text, reason text, details text, status text,
  reporter_id uuid, reporter_name text, handled_by uuid, handled_at timestamptz, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.mod_assert(p_actor, p_college);
  return query
    select r.id, r.target_type, r.target_id,
           case r.target_type
             when 'announcement' then (select a.title from public.announcements a where a.id = r.target_id)
             when 'profile' then (select pr.display_name from public.profiles pr where pr.user_id = r.target_id)
             when 'team_post' then (select t.title from public.team_posts t where t.id = r.target_id)
             when 'idea' then (select coalesce(nullif(btrim(i.title), ''), left(i.body, 60)) from public.ideas i where i.id = r.target_id)
             when 'idea_comment' then (select left(c.body, 60) from public.idea_comments c where c.id = r.target_id)
             when 'event' then (select e.title from public.events e where e.id = r.target_id)
             when 'listing' then (select b.title from public.board_posts b where b.id = r.target_id)
             when 'venue' then (select v.name from public.venues v where v.id = r.target_id)
             when 'debate' then (select d.title from public.debates d where d.id = r.target_id)
             when 'debate_argument' then (select left(a.body, 60) from public.debate_arguments a where a.id = r.target_id)
             else null end,
           r.reason, r.details, r.status,
           r.reporter_id, coalesce(rp.display_name, 'Former member'), r.handled_by, r.handled_at, r.created_at
    from public.reports r
    left join public.profiles rp on rp.user_id = r.reporter_id
    where r.college_id = p_college
      and (p_status is null or r.status = p_status)
      and (p_after_created is null or (r.created_at, r.id) < (p_after_created, p_after_id))
    order by r.created_at desc, r.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

create or replace function public.mod_act_on_report(
  p_actor uuid, p_college uuid, p_report uuid, p_action text, p_note text default null, p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rep public.reports;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_owner uuid;
  v_actor_role text;
  v_target public.memberships;
  v_college_name text;
  v_audit text;
  v_told boolean := false;
  v_removal text;
begin
  perform public.mod_assert(p_actor, p_college);
  if p_action not in ('dismiss', 'hide', 'warn', 'suspend') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_action <> 'dismiss' and (v_note is null or char_length(v_note) < 5) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  select * into v_rep from public.reports r where r.id = p_report and r.college_id = p_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_rep.status <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  v_owner := case v_rep.target_type
    when 'profile' then v_rep.target_id
    when 'announcement' then (select a.author_id from public.announcements a where a.id = v_rep.target_id)
    when 'team_post' then (select t.author_id from public.team_posts t where t.id = v_rep.target_id)
    when 'idea' then (select i.author_id from public.ideas i where i.id = v_rep.target_id)
    when 'idea_comment' then (select c.author_id from public.idea_comments c where c.id = v_rep.target_id)
    when 'event' then (select e.author_id from public.events e where e.id = v_rep.target_id)
    when 'listing' then (select b.author_id from public.board_posts b where b.id = v_rep.target_id)
    when 'venue' then (select v.created_by from public.venues v where v.id = v_rep.target_id)
    when 'debate' then (select d.author_id from public.debates d where d.id = v_rep.target_id)
    when 'debate_argument' then (select a.author_id from public.debate_arguments a where a.id = v_rep.target_id)
    else null end;
  -- Nobody handles a report about themselves.
  if v_owner is not null and v_owner = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select m.role into v_actor_role from public.memberships m where m.user_id = p_actor and m.college_id = p_college;
  select c.name into v_college_name from public.colleges c where c.id = p_college;

  if p_action = 'hide' then
    -- The reason of the report becomes the removal reason the author is told.
    v_removal := case v_rep.reason
      when 'spam' then 'spam' when 'harassment' then 'harassment' when 'inappropriate' then 'inappropriate'
      when 'scam' then 'scam' else 'other' end;
    if v_rep.target_type = 'announcement' then
      update public.announcements set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'team_post' then
      update public.team_posts set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'profile' then
      update public.memberships set profile_hidden_at = now() where user_id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type in ('idea', 'event', 'listing') then
      -- The same removal as the admin tools: hides it, writes the audit log and tells the author why.
      perform public.content_remove_internal(p_actor, v_actor_role, p_college,
        case v_rep.target_type when 'idea' then 'thought' else v_rep.target_type end,
        v_rep.target_id, v_removal, v_note);
      v_told := true;
    elsif v_rep.target_type = 'idea_comment' then
      update public.ideas set comment_count = greatest(comment_count - 1, 0)
       where id = (select c.idea_id from public.idea_comments c where c.id = v_rep.target_id and c.status = 'published');
      update public.idea_comments set status = 'removed' where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'debate' then
      update public.debates set status = 'removed' where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'debate_argument' then
      update public.debates set argument_count = greatest(argument_count - 1, 0)
       where id = (select a.debate_id from public.debate_arguments a where a.id = v_rep.target_id and a.status = 'published');
      update public.debate_arguments set status = 'removed' where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'venue' then
      update public.venues set status = 'hidden' where id = v_rep.target_id and college_id = p_college;
      update public.venue_bookings
         set status = 'declined', manager_note = 'This venue was removed by a moderator.', decided_by = p_actor, decided_at = now()
       where venue_id = v_rep.target_id and status = 'pending';
    else
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    if v_owner is not null and not v_told then
      perform public.notify_user(v_owner, p_college, 'moderation.hidden', 'Your content was hidden',
        'A moderator of ' || v_college_name || ' hid your content: ' || v_note, jsonb_build_object('report_id', v_rep.id));
    end if;
  elsif p_action = 'warn' then
    if v_owner is null then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    perform public.notify_user(v_owner, p_college, 'moderation.warned', 'A moderator sent you a warning',
      v_note, jsonb_build_object('report_id', v_rep.id));
  elsif p_action = 'suspend' then
    if v_owner is null then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    select * into v_target from public.memberships m where m.user_id = v_owner and m.college_id = p_college for update;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    -- A moderator may suspend students. An admin may also suspend moderators. Nobody suspends an admin here.
    if v_target.role = 'college_admin' or (v_target.role = 'moderator' and v_actor_role <> 'college_admin') then
      raise exception 'FORBIDDEN' using errcode = 'P0001';
    end if;
    if v_target.status <> 'active' then
      raise exception 'CONFLICT' using errcode = 'P0001';
    end if;
    update public.memberships
    set status = 'suspended', status_reason = v_note, status_changed_by = p_actor
    where id = v_target.id;
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
      handled_by = p_actor, handled_at = now()
  where id = v_rep.id returning * into v_rep;

  insert into public.moderation_actions (report_id, college_id, actor_id, action, reason)
  values (v_rep.id, p_college, p_actor, p_action, v_note);

  if v_rep.reporter_id is not null and v_rep.reporter_id <> p_actor then
    perform public.notify_user(v_rep.reporter_id, p_college, 'report.actioned', 'Your report was reviewed',
      case when p_action = 'dismiss' then 'A moderator reviewed your report and took no action.'
           else 'A moderator reviewed your report and took action.' end,
      jsonb_build_object('report_id', v_rep.id, 'outcome', p_action));
  end if;

  v_audit := case p_action
    when 'dismiss' then 'report.dismissed'
    when 'hide' then 'report.content_hidden'
    when 'warn' then 'report.owner_warned'
    else 'report.member_suspended' end;
  perform public.write_audit_log(
    p_college, p_actor, v_actor_role, v_audit, 'report', v_rep.id::text,
    jsonb_build_object('target_type', v_rep.target_type, 'target_id', v_rep.target_id), p_request_id
  );

  return jsonb_build_object('report', jsonb_build_object(
    'id', v_rep.id, 'status', v_rep.status, 'handled_by', v_rep.handled_by, 'handled_at', v_rep.handled_at));
end;
$$;

revoke all on function public.debate_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.debate_can_see(uuid, public.debates) from public, anon, authenticated;
revoke all on function public.debate_create(uuid, uuid, text, text, text, text, text, int) from public, anon, authenticated;
revoke all on function public.debate_list(uuid, uuid, text, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.debate_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.debate_pick_side(uuid, uuid, uuid, smallint) from public, anon, authenticated;
revoke all on function public.debate_argument_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.debate_argue(uuid, uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.debate_argument_list(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.debate_argument_vote(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.debate_remove(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.debate_argument_remove(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.debate_json(uuid, uuid) to service_role;
grant execute on function public.debate_can_see(uuid, public.debates) to service_role;
grant execute on function public.debate_create(uuid, uuid, text, text, text, text, text, int) to service_role;
grant execute on function public.debate_list(uuid, uuid, text, text, int, timestamptz, uuid) to service_role;
grant execute on function public.debate_get(uuid, uuid, uuid) to service_role;
grant execute on function public.debate_pick_side(uuid, uuid, uuid, smallint) to service_role;
grant execute on function public.debate_argument_json(uuid, uuid) to service_role;
grant execute on function public.debate_argue(uuid, uuid, uuid, text, boolean) to service_role;
grant execute on function public.debate_argument_list(uuid, uuid, uuid) to service_role;
grant execute on function public.debate_argument_vote(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.debate_remove(uuid, uuid, uuid) to service_role;
grant execute on function public.debate_argument_remove(uuid, uuid, uuid) to service_role;
