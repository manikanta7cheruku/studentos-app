-- Migration: redesign backend (R3-D11). Three things:
--   1. Team Finder gets two new kinds (sport, event) and a place.
--   2. Ideas: short text posts that students vote on and reply to (docs/API_CONTRACT.md section 15).
--   3. College setup codes: a college can only be created with a one-time code that the platform owner issues
--      (docs/AUTH_AND_TENANCY.md, decision D-30).
-- Same rule as the earlier tables: RLS is on, the only policies say "no", and only the server (service role) reaches
-- the data through the functions below. Every function checks the actor again inside the database.

-- ---------------------------------------------------------------------------
-- 1. Team Finder: kinds and place
-- ---------------------------------------------------------------------------
alter table public.team_posts drop constraint team_posts_kind_valid;
alter table public.team_posts add constraint team_posts_kind_valid
  check (kind in ('project', 'startup', 'hackathon', 'competition', 'sport', 'event'));

alter table public.team_posts add column place text;
alter table public.team_posts add constraint team_posts_place_length
  check (place is null or char_length(place) between 1 and 120);

-- Same function as before with one more key (place). Replacing keeps the signature, so nothing else changes.
create or replace function public.tf_post_json(p_post uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'kind', p.kind,
    'title', p.title,
    'description', p.description,
    'status', public.tf_shown_status(p.status, p.deadline),
    'deadline', p.deadline,
    'place', p.place,
    'external_link', p.external_link,
    'created_at', p.created_at,
    'is_owner', p.author_id = p_actor,
    'author', jsonb_build_object('user_id', p.author_id, 'display_name', coalesce(pr.display_name, 'Former member')),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'role_name', r.role_name, 'slots', r.slots, 'filled', r.filled,
        'skills', coalesce((select jsonb_agg(s.name order by s.name) from public.team_post_role_skills rs
                            join public.skills s on s.id = rs.skill_id where rs.role_id = r.id), '[]'::jsonb),
        'skill_ids', coalesce((select jsonb_agg(rs.skill_id order by rs.skill_id) from public.team_post_role_skills rs
                               where rs.role_id = r.id), '[]'::jsonb)
      ) order by r.position, r.id)
      from public.team_post_roles r where r.post_id = p.id
    ), '[]'::jsonb),
    'my_requests', coalesce((
      select jsonb_agg(jsonb_build_object('id', j.id, 'role_id', j.role_id, 'status', j.status) order by j.created_at)
      from public.join_requests j where j.post_id = p.id and j.applicant_id = p_actor
    ), '[]'::jsonb)
  )
  from public.team_posts p
  left join public.profiles pr on pr.user_id = p.author_id
  where p.id = p_post;
$$;

-- Only the author sets the place. An empty text clears it.
create function public.tf_set_place(p_actor uuid, p_post uuid, p_place text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.team_posts
     set place = nullif(btrim(coalesce(p_place, '')), '')
   where id = p_post and author_id = p_actor;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Ideas
-- ---------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  topic text not null default 'other',
  status text not null default 'published',
  score integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ideas_title_length check (char_length(title) between 5 and 140),
  constraint ideas_body_length check (char_length(body) <= 2000),
  constraint ideas_topic_valid check (topic in ('campus', 'study', 'sports', 'tech', 'food', 'other')),
  constraint ideas_status_valid check (status in ('published', 'removed')),
  constraint ideas_id_college_key unique (id, college_id)
);
create index ideas_feed_idx on public.ideas (college_id, status, created_at desc, id desc);
create index ideas_top_idx on public.ideas (college_id, status, score desc, created_at desc);
create index ideas_author_idx on public.ideas (author_id, created_at desc);

create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

create table public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id),
  constraint idea_votes_value_valid check (value in (-1, 1))
);

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.idea_comments (id) on delete cascade,
  body text not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint idea_comments_body_length check (char_length(body) between 1 and 800),
  constraint idea_comments_status_valid check (status in ('published', 'removed'))
);
create index idea_comments_idea_idx on public.idea_comments (idea_id, created_at, id);

alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.idea_comments enable row level security;
create policy ideas_no_client_access on public.ideas for select to authenticated using (false);
create policy idea_votes_no_client_access on public.idea_votes for select to authenticated using (false);
create policy idea_comments_no_client_access on public.idea_comments for select to authenticated using (false);
revoke all on public.ideas from anon, authenticated;
revoke all on public.idea_votes from anon, authenticated;
revoke all on public.idea_comments from anon, authenticated;

-- One idea as the screens see it. p_actor decides my_vote and is_owner.
create function public.idea_json(p_idea uuid, p_actor uuid)
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
    'author', jsonb_build_object(
      'user_id', i.author_id,
      'display_name', coalesce(pr.display_name, 'Former member'),
      'headline', pr.headline
    )
  )
  from public.ideas i
  left join public.profiles pr on pr.user_id = i.author_id
  where i.id = p_idea;
$$;

-- Can this person see this idea? Published, by a person still active in the college, and not blocked either way.
create function public.idea_can_see(p_actor uuid, p_idea public.ideas)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_idea.status = 'published' and (
    p_idea.author_id = p_actor
    or (
      exists (
        select 1 from public.memberships m
        where m.user_id = p_idea.author_id and m.college_id = p_idea.college_id and m.status = 'active'
      )
      and not public.is_blocked_between(p_actor, p_idea.author_id)
    )
  );
$$;

create function public.idea_create(
  p_actor uuid, p_college uuid, p_title text, p_body text, p_topic text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  -- At most 20 ideas a day per person.
  if (select count(*) from public.ideas t
      where t.author_id = p_actor and t.created_at > now() - interval '1 day') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.ideas (college_id, author_id, title, body, topic, score)
  values (p_college, p_actor, btrim(p_title), btrim(coalesce(p_body, '')), coalesce(p_topic, 'other'), 1)
  returning * into v_idea;
  -- The author's own vote starts it at 1, like anywhere else.
  insert into public.idea_votes (idea_id, user_id, value) values (v_idea.id, p_actor, 1);
  return public.idea_json(v_idea.id, p_actor);
end;
$$;

-- p_sort: 'new' pages with the cursor; 'top' shows the best of the last 30 days (no cursor).
create function public.idea_list(
  p_actor uuid, p_college uuid, p_sort text, p_topic text, p_mine boolean,
  p_limit int, p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  if p_sort = 'top' then
    return query
      select i.id, i.created_at, public.idea_json(i.id, p_actor)
      from public.ideas i
      where i.college_id = p_college
        and public.idea_can_see(p_actor, i)
        and i.created_at > now() - interval '30 days'
        and (p_topic is null or i.topic = p_topic)
        and (not coalesce(p_mine, false) or i.author_id = p_actor)
      order by i.score desc, i.created_at desc, i.id desc
      limit least(greatest(p_limit, 1), 51);
  else
    return query
      select i.id, i.created_at, public.idea_json(i.id, p_actor)
      from public.ideas i
      where i.college_id = p_college
        and public.idea_can_see(p_actor, i)
        and (p_topic is null or i.topic = p_topic)
        and (not coalesce(p_mine, false) or i.author_id = p_actor)
        and (p_after_created is null or (i.created_at, i.id) < (p_after_created, p_after_id))
      order by i.created_at desc, i.id desc
      limit least(greatest(p_limit, 1), 51);
  end if;
end;
$$;

create function public.idea_get(p_actor uuid, p_college uuid, p_idea uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_idea from public.ideas i where i.id = p_idea and i.college_id = p_college;
  if not found or not public.idea_can_see(p_actor, v_idea) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return public.idea_json(p_idea, p_actor);
end;
$$;

-- p_value: 1 up, -1 down, 0 take my vote back. Returns the idea with the new score.
create function public.idea_vote(p_actor uuid, p_college uuid, p_idea uuid, p_value smallint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
  v_old smallint;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_value not in (-1, 0, 1) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_idea from public.ideas i where i.id = p_idea and i.college_id = p_college for update;
  if not found or not public.idea_can_see(p_actor, v_idea) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select v.value into v_old from public.idea_votes v where v.idea_id = p_idea and v.user_id = p_actor;
  v_old := coalesce(v_old, 0);
  if p_value = 0 then
    delete from public.idea_votes where idea_id = p_idea and user_id = p_actor;
  else
    insert into public.idea_votes (idea_id, user_id, value) values (p_idea, p_actor, p_value)
    on conflict (idea_id, user_id) do update set value = excluded.value;
  end if;
  update public.ideas set score = score - v_old + p_value where id = p_idea;
  return public.idea_json(p_idea, p_actor);
end;
$$;

-- Author or a moderator or admin of the college removes an idea. Its replies go with it.
create function public.idea_remove(p_actor uuid, p_college uuid, p_idea uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_idea from public.ideas i where i.id = p_idea and i.college_id = p_college;
  if not found or v_idea.status = 'removed' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_idea.author_id <> p_actor and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.ideas set status = 'removed' where id = p_idea;
  if v_idea.author_id <> p_actor then
    perform public.write_audit_log(p_college, p_actor, v_role, 'idea.removed', 'idea', p_idea::text,
      jsonb_build_object('title', v_idea.title), null);
  end if;
end;
$$;

create function public.idea_comment_json(p_comment uuid, p_actor uuid)
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
    'author', jsonb_build_object('user_id', c.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.idea_comments c
  left join public.profiles pr on pr.user_id = c.author_id
  where c.id = p_comment;
$$;

create function public.idea_comment_create(
  p_actor uuid, p_college uuid, p_idea uuid, p_parent uuid, p_body text
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
  -- A reply goes under a top level comment of the same idea (one level of replies keeps it readable).
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
  insert into public.idea_comments (idea_id, college_id, author_id, parent_id, body)
  values (p_idea, p_college, p_actor, p_parent, btrim(p_body))
  returning * into v_comment;
  update public.ideas set comment_count = comment_count + 1 where id = p_idea;
  return public.idea_comment_json(v_comment.id, p_actor);
end;
$$;

create function public.idea_comment_list(p_actor uuid, p_college uuid, p_idea uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_idea from public.ideas i where i.id = p_idea and i.college_id = p_college;
  if not found or not public.idea_can_see(p_actor, v_idea) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return coalesce((
    select jsonb_agg(public.idea_comment_json(c.id, p_actor) order by c.created_at, c.id)
    from public.idea_comments c
    where c.idea_id = p_idea and c.status = 'published'
      and not public.is_blocked_between(p_actor, c.author_id)
  ), '[]'::jsonb);
end;
$$;

create function public.idea_comment_remove(p_actor uuid, p_college uuid, p_comment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment public.idea_comments;
  v_role text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_comment from public.idea_comments c where c.id = p_comment and c.college_id = p_college;
  if not found or v_comment.status = 'removed' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select m.role into v_role from public.memberships m
   where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if v_comment.author_id <> p_actor and v_role not in ('moderator', 'college_admin') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  update public.idea_comments set status = 'removed' where id = p_comment;
  update public.ideas set comment_count = greatest(comment_count - 1, 0) where id = v_comment.idea_id;
end;
$$;

revoke all on function public.idea_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.idea_can_see(uuid, public.ideas) from public, anon, authenticated;
revoke all on function public.idea_create(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.idea_list(uuid, uuid, text, text, boolean, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.idea_get(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.idea_vote(uuid, uuid, uuid, smallint) from public, anon, authenticated;
revoke all on function public.idea_remove(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.idea_comment_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.idea_comment_create(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.idea_comment_list(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.idea_comment_remove(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.tf_set_place(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.idea_create(uuid, uuid, text, text, text) to service_role;
grant execute on function public.idea_list(uuid, uuid, text, text, boolean, int, timestamptz, uuid) to service_role;
grant execute on function public.idea_get(uuid, uuid, uuid) to service_role;
grant execute on function public.idea_vote(uuid, uuid, uuid, smallint) to service_role;
grant execute on function public.idea_remove(uuid, uuid, uuid) to service_role;
grant execute on function public.idea_comment_create(uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.idea_comment_list(uuid, uuid, uuid) to service_role;
grant execute on function public.idea_comment_remove(uuid, uuid, uuid) to service_role;
grant execute on function public.tf_set_place(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. College setup codes
-- The owner makes a code with supabase/production/create-setup-code.sql. Only its hash is stored. A code works once,
-- for 14 days at most. A person with a valid code makes their own college and becomes its first admin.
-- ---------------------------------------------------------------------------
create table public.college_setup_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null default '',
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  college_id uuid references public.colleges (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint college_setup_codes_hash_length check (char_length(code_hash) = 64),
  constraint college_setup_codes_label_length check (char_length(label) <= 120)
);
alter table public.college_setup_codes enable row level security;
create policy college_setup_codes_no_client_access on public.college_setup_codes for select to authenticated using (false);
revoke all on public.college_setup_codes from anon, authenticated;

-- The owner runs this in the SQL editor. It returns the code once. Example: select * from public.make_college_setup_code('Alpha Institute', 14);
create function public.make_college_setup_code(p_label text, p_days int default 14)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_days < 1 or p_days > 30 then
    raise exception 'days must be between 1 and 30';
  end if;
  -- 8 digits, never starting with 0, so it is never shortened when copied.
  v_code := lpad((10000000 + floor(random() * 89999999))::bigint::text, 8, '0');
  insert into public.college_setup_codes (code_hash, label, expires_at)
  values (encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), coalesce(btrim(p_label), ''), now() + make_interval(days => p_days));
  return v_code;
end;
$$;

-- Makes the college and its first admin. All or nothing. The same errors as the rest of the API.
create function public.college_setup_create(
  p_actor uuid, p_code_hash text, p_slug text, p_name text, p_short text, p_city text, p_state text,
  p_domains text[], p_methods text[], p_require_approval boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.college_setup_codes;
  v_college uuid;
  v_domain text;
begin
  if p_actor is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_code from public.college_setup_codes c where c.code_hash = p_code_hash for update;
  if not found or v_code.used_at is not null or v_code.expires_at <= now() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' or p_slug = 'global' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.colleges c where c.slug = p_slug) then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  insert into public.colleges (slug, name, short_name, city, state, status, accent_hex, created_by)
  values (p_slug, btrim(p_name), nullif(btrim(coalesce(p_short, '')), ''), btrim(coalesce(p_city, '')),
          btrim(coalesce(p_state, '')), 'active', '#7656FF', p_actor)
  returning id into v_college;
  foreach v_domain in array coalesce(p_domains, array[]::text[]) loop
    insert into public.college_domains (college_id, domain, verified_at)
    values (v_college, lower(btrim(v_domain)), now())
    on conflict do nothing;
  end loop;
  insert into public.memberships (user_id, college_id, role, status, verification_level, verification_method, joined_at)
  values (p_actor, v_college, 'college_admin', 'active', 3, 'manual', now());
  update public.college_settings
     set allowed_methods = case when coalesce(array_length(p_methods, 1), 0) > 0 then p_methods else allowed_methods end,
         require_admin_approval = coalesce(p_require_approval, require_admin_approval)
   where college_id = v_college;
  update public.college_setup_codes
     set used_at = now(), used_by = p_actor, college_id = v_college
   where id = v_code.id;
  perform public.write_audit_log(v_college, p_actor, 'college_admin', 'college.created', 'college', v_college::text,
    jsonb_build_object('source', 'setup-code', 'slug', p_slug), null);
  return jsonb_build_object('college_id', v_college, 'slug', p_slug);
end;
$$;

revoke all on function public.make_college_setup_code(text, int) from public, anon, authenticated;
revoke all on function public.college_setup_create(uuid, text, text, text, text, text, text, text[], text[], boolean) from public, anon, authenticated;
grant execute on function public.college_setup_create(uuid, text, text, text, text, text, text, text[], text[], boolean) to service_role;
