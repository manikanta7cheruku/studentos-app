-- Migration: weekly challenges and contributions on the profile (R3-D29, decisions D-51 and D-52).
--   * One challenge a week, the same for everyone (it is written in the app, not in the database). A person answers it with a
--     short text, and others can applaud. Doing a challenge adds to the contributions on the profile.
--   * `profile_contributions` counts what a person gave: buzz, replies, plans, events, upvotes received, challenges done and
--     friends invited. Anonymous posts never count, so nobody can tell who wrote them from a profile.
-- Same rule as the earlier tables: closed tables, only the server (service role) calls the functions.

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint challenge_entries_week_user_key unique (week_key, user_id),
  constraint challenge_entries_week_format check (week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  constraint challenge_entries_body_length check (char_length(body) between 1 and 300)
);
create index challenge_entries_week_idx on public.challenge_entries (week_key, created_at desc);

create table public.challenge_applause (
  entry_id uuid not null references public.challenge_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

alter table public.challenge_entries enable row level security;
alter table public.challenge_applause enable row level security;
create policy challenge_entries_no_client_access on public.challenge_entries for select to authenticated using (false);
create policy challenge_applause_no_client_access on public.challenge_applause for select to authenticated using (false);
revoke all on public.challenge_entries from anon, authenticated;
revoke all on public.challenge_applause from anon, authenticated;

create function public.challenge_entry_json(p_entry uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'body', e.body,
    'created_at', e.created_at,
    'is_mine', e.user_id = p_actor,
    'applause', (select count(*) from public.challenge_applause a where a.entry_id = e.id),
    'i_applauded', exists (select 1 from public.challenge_applause a where a.entry_id = e.id and a.user_id = p_actor),
    'author', jsonb_build_object('user_id', e.user_id, 'display_name', coalesce(pr.display_name, 'Former member'),
                                 'avatar_path', pr.avatar_path)
  )
  from public.challenge_entries e
  left join public.profiles pr on pr.user_id = e.user_id
  where e.id = p_entry;
$$;

-- Answer this week's challenge (or change my answer). Needs an active membership somewhere, Global included.
create function public.challenge_submit(p_user uuid, p_week text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.memberships m where m.user_id = p_user and m.status = 'active') then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.challenge_entries (week_key, user_id, body) values (p_week, p_user, btrim(p_body))
  on conflict (week_key, user_id) do update set body = excluded.body
  returning id into v_id;
  return public.challenge_entry_json(v_id, p_user);
end;
$$;

-- Answers to a week's challenge, the most applauded first, without people I blocked or who blocked me.
create function public.challenge_list(p_actor uuid, p_week text, p_limit int default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.item order by x.applause desc, x.created_at desc), '[]'::jsonb)
  from (
    select public.challenge_entry_json(e.id, p_actor) as item, e.created_at,
           (select count(*) from public.challenge_applause a where a.entry_id = e.id) as applause
    from public.challenge_entries e
    where e.week_key = p_week and not public.is_blocked_between(p_actor, e.user_id)
    order by applause desc, e.created_at desc
    limit least(greatest(p_limit, 1), 50)
  ) x;
$$;

-- Applaud (p_on true) or take it back. Not your own answer. Safe to repeat.
create function public.challenge_applaud(p_actor uuid, p_entry uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select e.user_id into v_owner from public.challenge_entries e where e.id = p_entry;
  if v_owner is null or public.is_blocked_between(p_actor, v_owner) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_owner = p_actor then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_on then
    insert into public.challenge_applause (entry_id, user_id) values (p_entry, p_actor) on conflict do nothing;
  else
    delete from public.challenge_applause where entry_id = p_entry and user_id = p_actor;
  end if;
  return public.challenge_entry_json(p_entry, p_actor);
end;
$$;

-- What a person gave. Counts only, and never anonymous posts.
create function public.profile_contributions(p_user uuid)
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
    -- Upvotes other people gave. The author's own starting vote is not counted.
    'upvotes', coalesce((select sum(greatest(i.score - 1, 0)) from public.ideas i
                         where i.author_id = p_user and i.status = 'published' and not i.is_anonymous), 0)
             + coalesce((select sum(greatest(c.score, 0)) from public.idea_comments c
                         where c.author_id = p_user and c.status = 'published' and not c.is_anonymous), 0),
    'challenges', (select count(*) from public.challenge_entries e where e.user_id = p_user),
    'invited', (select count(*) from public.referrals r where r.inviter_id = p_user)
  );
$$;

revoke all on function public.challenge_entry_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.challenge_submit(uuid, text, text) from public, anon, authenticated;
revoke all on function public.challenge_list(uuid, text, int) from public, anon, authenticated;
revoke all on function public.challenge_applaud(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.profile_contributions(uuid) from public, anon, authenticated;
grant execute on function public.challenge_entry_json(uuid, uuid) to service_role;
grant execute on function public.challenge_submit(uuid, text, text) to service_role;
grant execute on function public.challenge_list(uuid, text, int) to service_role;
grant execute on function public.challenge_applaud(uuid, uuid, boolean) to service_role;
grant execute on function public.profile_contributions(uuid) to service_role;
