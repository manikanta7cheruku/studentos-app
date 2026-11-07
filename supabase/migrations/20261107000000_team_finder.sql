-- Migration: Team Finder (R2-D5-1). Spec: docs/DATABASE.md section 2.4, docs/API_CONTRACT.md TMF-01..09, docs/PRD.md AC-TMF-004.
-- Everything is closed to clients: RLS is on, the only policies say "no" (using false), and only the server (service role)
-- reaches the data through the functions below. Every function checks the actor again inside the database.

-- ---------------------------------------------------------------------------
-- New notification types
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'membership.approved', 'membership.rejected', 'announcement.published',
  'report.actioned', 'moderation.warned', 'moderation.hidden',
  'team.request_received', 'team.request_accepted', 'team.request_declined',
  'team.request_cancelled', 'team.request_withdrawn'
));

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.team_posts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  description text not null default '',
  status text not null default 'open',
  deadline timestamptz,
  external_link text,
  moderation_hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  constraint team_posts_kind_valid check (kind in ('project', 'startup', 'hackathon', 'competition')),
  constraint team_posts_title_length check (char_length(title) between 5 and 120),
  constraint team_posts_description_length check (char_length(description) <= 3000),
  constraint team_posts_status_valid check (status in ('open', 'closed', 'filled', 'expired', 'removed')),
  constraint team_posts_link_https check (external_link is null or (char_length(external_link) <= 500 and external_link ~ '^https://[^[:space:]]+$')),
  constraint team_posts_id_college_key unique (id, college_id)
);

create index team_posts_college_idx on public.team_posts (college_id, status, created_at desc, id desc);
create index team_posts_author_idx on public.team_posts (author_id, created_at desc);
create index team_posts_search_idx on public.team_posts using gin (search);

create trigger team_posts_set_updated_at
  before update on public.team_posts
  for each row execute function public.set_updated_at();

-- The team chat link is shown only to the author and to accepted members, so it lives in its own table.
create table public.team_post_private (
  post_id uuid primary key references public.team_posts (id) on delete cascade,
  team_link text not null,
  constraint team_post_private_https check (char_length(team_link) <= 500 and team_link ~ '^https://[^[:space:]]+$')
);

create table public.team_post_roles (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  college_id uuid not null,
  role_name text not null,
  slots smallint not null,
  filled smallint not null default 0,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint team_post_roles_post_fkey foreign key (post_id, college_id)
    references public.team_posts (id, college_id) on delete cascade,
  constraint team_post_roles_name_length check (char_length(role_name) between 1 and 60),
  constraint team_post_roles_slots_range check (slots between 1 and 20),
  constraint team_post_roles_filled_range check (filled between 0 and slots),
  constraint team_post_roles_id_post_key unique (id, post_id)
);

create index team_post_roles_post_idx on public.team_post_roles (post_id);

create table public.team_post_role_skills (
  role_id uuid not null references public.team_post_roles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (role_id, skill_id)
);

create index team_post_role_skills_skill_idx on public.team_post_role_skills (skill_id);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges (id) on delete restrict,
  post_id uuid not null,
  role_id uuid not null,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  message text not null default '',
  status text not null default 'pending',
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  constraint join_requests_role_fkey foreign key (role_id, post_id)
    references public.team_post_roles (id, post_id) on delete cascade,
  constraint join_requests_message_length check (char_length(message) <= 500),
  constraint join_requests_note_length check (decision_note is null or char_length(decision_note) <= 500),
  constraint join_requests_status_valid check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'cancelled'))
);

-- One live request (pending or accepted) per person and role. This is what stops a double click.
create unique index join_requests_one_live_key on public.join_requests (role_id, applicant_id)
  where status in ('pending', 'accepted');
create index join_requests_post_idx on public.join_requests (post_id, status, created_at desc, id desc);
create index join_requests_applicant_idx on public.join_requests (applicant_id, created_at desc, id desc);

alter table public.team_posts enable row level security;
alter table public.team_post_private enable row level security;
alter table public.team_post_roles enable row level security;
alter table public.team_post_role_skills enable row level security;
alter table public.join_requests enable row level security;

-- No client policies on purpose: the server reaches these tables through the functions below.
create policy team_posts_no_client_access on public.team_posts for select to authenticated using (false);
create policy team_post_private_no_client_access on public.team_post_private for select to authenticated using (false);
create policy team_post_roles_no_client_access on public.team_post_roles for select to authenticated using (false);
create policy team_post_role_skills_no_client_access on public.team_post_role_skills for select to authenticated using (false);
create policy join_requests_no_client_access on public.join_requests for select to authenticated using (false);

revoke all on public.team_posts from anon, authenticated;
revoke all on public.team_post_private from anon, authenticated;
revoke all on public.team_post_roles from anon, authenticated;
revoke all on public.team_post_role_skills from anon, authenticated;
revoke all on public.join_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- The caller must be an active member with at least `p_level`. A college that is suspended refuses everything.
create function public.tf_assert_member(p_actor uuid, p_college uuid, p_for_write boolean)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_level smallint;
  v_needed smallint := 1;
begin
  select m.verification_level into v_level
  from public.memberships m
  where m.user_id = p_actor and m.college_id = p_college and m.status = 'active';
  if p_actor is null or v_level is null or v_level < 1 then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.colleges c where c.id = p_college and c.status in ('suspended', 'archived')) then
    raise exception 'TENANT_SUSPENDED' using errcode = 'P0001';
  end if;
  if p_for_write then
    select s.min_level_to_post into v_needed from public.college_settings s where s.college_id = p_college;
    if v_level < coalesce(v_needed, 1) then
      raise exception 'VERIFICATION_LEVEL_TOO_LOW' using errcode = 'P0001';
    end if;
  end if;
end;
$$;

-- What status the world sees: an open post past its deadline is "expired" even before a sweeper marks it.
create function public.tf_shown_status(p_status text, p_deadline timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_status = 'open' and p_deadline is not null and p_deadline <= now() then 'expired' else p_status end;
$$;

-- Can this person see this post? Same college, not removed, not hidden by a moderator, author still an active
-- member, and nobody blocked the other. The author always sees their own post (except removed).
create function public.tf_can_see(p_actor uuid, p_post public.team_posts)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_post.status <> 'removed' and (
    p_post.author_id = p_actor
    or (
      p_post.moderation_hidden_at is null
      and exists (
        select 1 from public.memberships m
        where m.user_id = p_post.author_id and m.college_id = p_post.college_id and m.status = 'active'
      )
      and not public.is_blocked_between(p_actor, p_post.author_id)
    )
  );
$$;

create function public.tf_post_json(p_post uuid, p_actor uuid)
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

-- ---------------------------------------------------------------------------
-- TMF-01 create
-- p_roles: [{ "role_name": "...", "slots": 1, "skill_ids": ["..."] }]
-- ---------------------------------------------------------------------------
create function public.tf_create_post(
  p_actor uuid, p_college uuid, p_kind text, p_title text, p_description text,
  p_deadline timestamptz, p_external_link text, p_team_link text, p_roles jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_role jsonb;
  v_role_id uuid;
  v_skill text;
  v_pos int;
  v_count int;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  if p_deadline is not null and (p_deadline <= now() or p_deadline > now() + interval '180 days') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_roles is null or jsonb_typeof(p_roles) <> 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  v_count := jsonb_array_length(p_roles);
  if v_count < 1 or v_count > 8 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  -- At most 10 open posts per person, so one person cannot flood the board.
  if (select count(*) from public.team_posts t
      where t.author_id = p_actor and t.college_id = p_college and t.status = 'open') >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.team_posts (college_id, author_id, kind, title, description, deadline, external_link)
  values (p_college, p_actor, p_kind, btrim(p_title), btrim(coalesce(p_description, '')), p_deadline,
          nullif(btrim(coalesce(p_external_link, '')), ''))
  returning * into v_post;

  if nullif(btrim(coalesce(p_team_link, '')), '') is not null then
    insert into public.team_post_private (post_id, team_link) values (v_post.id, btrim(p_team_link));
  end if;

  for v_role, v_pos in select e.value, e.ordinality from jsonb_array_elements(p_roles) with ordinality as e loop
    insert into public.team_post_roles (post_id, college_id, role_name, slots, position)
    values (v_post.id, p_college, btrim(v_role ->> 'role_name'), (v_role ->> 'slots')::smallint, v_pos)
    returning id into v_role_id;
    for v_skill in select * from jsonb_array_elements_text(coalesce(v_role -> 'skill_ids', '[]'::jsonb)) loop
      if not exists (select 1 from public.skills s where s.id = v_skill::uuid and s.status = 'approved') then
        raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
      end if;
      insert into public.team_post_role_skills (role_id, skill_id) values (v_role_id, v_skill::uuid)
      on conflict do nothing;
    end loop;
  end loop;

  return public.tf_post_json(v_post.id, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-02 list. Newest first. p_status: open (default in the API), closed, filled, expired, or null for all.
-- ---------------------------------------------------------------------------
create function public.tf_list_posts(
  p_actor uuid, p_college uuid, p_kind text, p_status text, p_skill uuid, p_q text, p_mine boolean,
  p_limit int, p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select p.id, p.created_at, public.tf_post_json(p.id, p_actor)
    from public.team_posts p
    where p.college_id = p_college
      and public.tf_can_see(p_actor, p)
      and (not coalesce(p_mine, false) or p.author_id = p_actor)
      and (p_kind is null or p.kind = p_kind)
      and (p_status is null or public.tf_shown_status(p.status, p.deadline) = p_status)
      and (p_skill is null or exists (
            select 1 from public.team_post_roles r
            join public.team_post_role_skills rs on rs.role_id = r.id
            where r.post_id = p.id and rs.skill_id = p_skill))
      and (v_q is null
           or p.search @@ websearch_to_tsquery('english', v_q)
           or p.title ilike '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and (p_after_created is null or (p.created_at, p.id) < (p_after_created, p_after_id))
    order by p.created_at desc, p.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-03 detail. team_link only for the author and accepted members. pending_requests only for the author.
-- ---------------------------------------------------------------------------
create function public.tf_get_post(p_actor uuid, p_college uuid, p_post uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_json jsonb;
  v_link text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  v_json := public.tf_post_json(p_post, p_actor);
  v_link := null;
  if v_post.author_id = p_actor or exists (
    select 1 from public.join_requests j
    where j.post_id = p_post and j.applicant_id = p_actor and j.status = 'accepted'
  ) then
    select t.team_link into v_link from public.team_post_private t where t.post_id = p_post;
  end if;
  v_json := v_json || jsonb_build_object('team_link', v_link);
  if v_post.author_id = p_actor then
    v_json := v_json || jsonb_build_object('pending_requests',
      (select count(*) from public.join_requests j where j.post_id = p_post and j.status = 'pending'));
  end if;
  return v_json;
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-04 edit (owner, open posts only). Only the keys present in p_patch change; null clears a link or deadline.
-- ---------------------------------------------------------------------------
create function public.tf_update_post(p_actor uuid, p_college uuid, p_post uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_deadline timestamptz;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college for update;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if public.tf_shown_status(v_post.status, v_post.deadline) <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if p_patch ? 'deadline' then
    v_deadline := nullif(p_patch ->> 'deadline', '')::timestamptz;
    if v_deadline is not null and (v_deadline <= now() or v_deadline > now() + interval '180 days') then
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
  else
    v_deadline := v_post.deadline;
  end if;
  update public.team_posts set
    title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else title end,
    description = case when p_patch ? 'description' then btrim(coalesce(p_patch ->> 'description', '')) else description end,
    external_link = case when p_patch ? 'external_link' then nullif(btrim(coalesce(p_patch ->> 'external_link', '')), '') else external_link end,
    kind = case when p_patch ? 'kind' then p_patch ->> 'kind' else kind end,
    deadline = v_deadline
  where id = p_post;
  if p_patch ? 'team_link' then
    if nullif(btrim(coalesce(p_patch ->> 'team_link', '')), '') is null then
      delete from public.team_post_private where post_id = p_post;
    else
      insert into public.team_post_private (post_id, team_link) values (p_post, btrim(p_patch ->> 'team_link'))
      on conflict (post_id) do update set team_link = excluded.team_link;
    end if;
  end if;
  return public.tf_post_json(p_post, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-05 close (owner). Pending requests are cancelled and the applicants are told.
-- ---------------------------------------------------------------------------
create function public.tf_close_post(p_actor uuid, p_college uuid, p_post uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_req record;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college for update;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_post.status <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.team_posts set status = 'closed' where id = p_post;
  for v_req in
    update public.join_requests j set status = 'cancelled', decided_at = now()
    where j.post_id = p_post and j.status = 'pending'
    returning j.id, j.applicant_id
  loop
    perform public.notify_user(v_req.applicant_id, p_college, 'team.request_cancelled', 'Team post closed',
      'The post "' || v_post.title || '" was closed, so your request was cancelled.',
      jsonb_build_object('post_id', p_post, 'request_id', v_req.id));
  end loop;
  return public.tf_post_json(p_post, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-06 request a role
-- ---------------------------------------------------------------------------
create function public.tf_create_request(p_actor uuid, p_college uuid, p_post uuid, p_role uuid, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_role public.team_post_roles;
  v_req public.join_requests;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_role from public.team_post_roles r where r.id = p_role and r.post_id = p_post;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if public.tf_shown_status(v_post.status, v_post.deadline) <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if v_role.filled >= v_role.slots then
    raise exception 'SLOTS_FULL' using errcode = 'P0001';
  end if;
  -- At most 10 requests waiting at the same time per person.
  if (select count(*) from public.join_requests j
      where j.applicant_id = p_actor and j.college_id = p_college and j.status = 'pending') >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  begin
    insert into public.join_requests (college_id, post_id, role_id, applicant_id, message)
    values (p_college, p_post, p_role, p_actor, btrim(coalesce(p_message, '')))
    returning * into v_req;
  exception when unique_violation then
    raise exception 'ALREADY_REQUESTED' using errcode = 'P0001';
  end;
  perform public.notify_user(v_post.author_id, p_college, 'team.request_received', 'New request to join',
    coalesce((select pr.display_name from public.profiles pr where pr.user_id = p_actor), 'Someone')
      || ' asked to join "' || v_post.title || '" as ' || v_role.role_name || '.',
    jsonb_build_object('post_id', p_post, 'role_id', p_role, 'request_id', v_req.id));
  return jsonb_build_object('id', v_req.id, 'post_id', v_req.post_id, 'role_id', v_req.role_id,
    'status', v_req.status, 'message', v_req.message, 'created_at', v_req.created_at);
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-07 requests of one post (owner)
-- ---------------------------------------------------------------------------
create function public.tf_list_requests(
  p_actor uuid, p_college uuid, p_post uuid, p_status text, p_limit int,
  p_after_created timestamptz default null, p_after_id uuid default null
)
returns table (id uuid, created_at timestamptz, item jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select j.id, j.created_at, jsonb_build_object(
      'id', j.id, 'role_id', j.role_id, 'role_name', r.role_name, 'status', j.status, 'message', j.message,
      'created_at', j.created_at, 'decided_at', j.decided_at, 'decision_note', j.decision_note,
      'applicant', jsonb_build_object(
        'user_id', j.applicant_id,
        'display_name', coalesce(pr.display_name, 'Former member'),
        'headline', pr.headline,
        'skills', coalesce((select jsonb_agg(s.name order by s.name) from public.user_skills us
                            join public.skills s on s.id = us.skill_id where us.user_id = j.applicant_id), '[]'::jsonb)
      )
    )
    from public.join_requests j
    join public.team_post_roles r on r.id = j.role_id
    left join public.profiles pr on pr.user_id = j.applicant_id
    where j.post_id = p_post
      and (p_status is null or j.status = p_status)
      and (p_after_created is null or (j.created_at, j.id) < (p_after_created, p_after_id))
    order by j.created_at desc, j.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

-- My own requests across posts of this college (for the applicant's "My requests" screen).
create function public.tf_list_my_requests(
  p_actor uuid, p_college uuid, p_status text, p_limit int,
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
    select j.id, j.created_at, jsonb_build_object(
      'id', j.id, 'status', j.status, 'message', j.message, 'created_at', j.created_at,
      'decided_at', j.decided_at, 'decision_note', j.decision_note,
      'post', jsonb_build_object('id', p.id, 'title', p.title, 'kind', p.kind,
                                 'status', public.tf_shown_status(p.status, p.deadline)),
      'role', jsonb_build_object('id', r.id, 'role_name', r.role_name)
    )
    from public.join_requests j
    join public.team_posts p on p.id = j.post_id
    join public.team_post_roles r on r.id = j.role_id
    where j.applicant_id = p_actor and j.college_id = p_college
      and p.status <> 'removed'
      and (p_status is null or j.status = p_status)
      and (p_after_created is null or (j.created_at, j.id) < (p_after_created, p_after_id))
    order by j.created_at desc, j.id desc
    limit least(greatest(p_limit, 1), 51);
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-08 decision (owner). AC-TMF-004: two accepts at once for one slot -> exactly one wins, the other SLOTS_FULL.
-- The role row is locked (for update) before the slot count is read.
-- ---------------------------------------------------------------------------
create function public.tf_decide_request(p_actor uuid, p_college uuid, p_request uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.join_requests;
  v_post public.team_posts;
  v_role public.team_post_roles;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_other record;
  v_all_full boolean;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  if p_decision not in ('accepted', 'declined') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_req from public.join_requests j where j.id = p_request and j.college_id = p_college;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  -- Lock order: post, then role, then request. Every function that changes these uses the same order.
  select * into v_post from public.team_posts p where p.id = v_req.post_id for update;
  if not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select * into v_role from public.team_post_roles r where r.id = v_req.role_id for update;
  select * into v_req from public.join_requests j where j.id = p_request for update;
  if v_req.status <> 'pending' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  if public.tf_shown_status(v_post.status, v_post.deadline) <> 'open' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  if p_decision = 'accepted' then
    if v_role.filled >= v_role.slots then
      raise exception 'SLOTS_FULL' using errcode = 'P0001';
    end if;
    update public.team_post_roles set filled = filled + 1 where id = v_role.id returning * into v_role;
  end if;

  update public.join_requests
  set status = p_decision, decided_by = p_actor, decided_at = now(), decision_note = v_note
  where id = p_request
  returning * into v_req;

  perform public.notify_user(v_req.applicant_id, p_college,
    case p_decision when 'accepted' then 'team.request_accepted' else 'team.request_declined' end,
    case p_decision when 'accepted' then 'Your request was accepted' else 'Your request was declined' end,
    case p_decision
      when 'accepted' then 'You were accepted as ' || v_role.role_name || ' in "' || v_post.title || '".'
      else 'Your request for ' || v_role.role_name || ' in "' || v_post.title || '" was declined.' end
      || coalesce(' Note: ' || v_note, ''),
    jsonb_build_object('post_id', v_post.id, 'role_id', v_role.id, 'request_id', v_req.id));

  -- When every role is full the post is filled and the other waiting requests are cancelled.
  if p_decision = 'accepted' then
    select not exists (select 1 from public.team_post_roles r where r.post_id = v_post.id and r.filled < r.slots)
      into v_all_full;
    if v_all_full then
      update public.team_posts set status = 'filled' where id = v_post.id;
      for v_other in
        update public.join_requests j set status = 'cancelled', decided_at = now()
        where j.post_id = v_post.id and j.status = 'pending'
        returning j.id, j.applicant_id
      loop
        perform public.notify_user(v_other.applicant_id, p_college, 'team.request_cancelled', 'Team is full',
          'The team for "' || v_post.title || '" is full, so your request was cancelled.',
          jsonb_build_object('post_id', v_post.id, 'request_id', v_other.id));
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'request', jsonb_build_object('id', v_req.id, 'status', v_req.status),
    'role', jsonb_build_object('id', v_role.id, 'slots', v_role.slots, 'filled', v_role.filled)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- TMF-09 withdraw (applicant). After an acceptance this frees the slot and is recorded in the audit log.
-- ---------------------------------------------------------------------------
create function public.tf_withdraw_request(p_actor uuid, p_college uuid, p_request uuid, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.join_requests;
  v_post public.team_posts;
  v_role public.team_post_roles;
  v_was text;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_req from public.join_requests j
  where j.id = p_request and j.college_id = p_college and j.applicant_id = p_actor;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_post from public.team_posts p where p.id = v_req.post_id for update;
  select * into v_role from public.team_post_roles r where r.id = v_req.role_id for update;
  select * into v_req from public.join_requests j where j.id = p_request for update;
  v_was := v_req.status;
  if v_was not in ('pending', 'accepted') then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  update public.join_requests set status = 'withdrawn', decided_at = now() where id = p_request;
  if v_was = 'accepted' then
    update public.team_post_roles set filled = filled - 1 where id = v_role.id;
    if v_post.status = 'filled' then
      update public.team_posts set status = 'open' where id = v_post.id;
    end if;
    perform public.write_audit_log(
      p_college, p_actor, (select m.role from public.memberships m where m.user_id = p_actor and m.college_id = p_college),
      'team.accepted_member_withdrew', 'join_request', p_request::text,
      jsonb_build_object('post_id', v_post.id, 'role_id', v_role.id), p_request_id);
    perform public.notify_user(v_post.author_id, p_college, 'team.request_withdrawn', 'A teammate left',
      coalesce((select pr.display_name from public.profiles pr where pr.user_id = p_actor), 'Someone')
        || ' withdrew from ' || v_role.role_name || ' in "' || v_post.title || '". The slot is free again.',
      jsonb_build_object('post_id', v_post.id, 'role_id', v_role.id, 'request_id', p_request));
  end if;
  return jsonb_build_object('id', p_request, 'status', 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: only the server (service role) calls these.
-- ---------------------------------------------------------------------------
revoke all on function public.tf_assert_member(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.tf_shown_status(text, timestamptz) from public, anon, authenticated;
revoke all on function public.tf_can_see(uuid, public.team_posts) from public, anon, authenticated;
revoke all on function public.tf_post_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.tf_create_post(uuid, uuid, text, text, text, timestamptz, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.tf_list_posts(uuid, uuid, text, text, uuid, text, boolean, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.tf_get_post(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.tf_update_post(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.tf_close_post(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.tf_create_request(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.tf_list_requests(uuid, uuid, uuid, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.tf_list_my_requests(uuid, uuid, text, int, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.tf_decide_request(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.tf_withdraw_request(uuid, uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.tf_assert_member(uuid, uuid, boolean) to service_role;
grant execute on function public.tf_shown_status(text, timestamptz) to service_role;
grant execute on function public.tf_can_see(uuid, public.team_posts) to service_role;
grant execute on function public.tf_post_json(uuid, uuid) to service_role;
grant execute on function public.tf_create_post(uuid, uuid, text, text, text, timestamptz, text, text, jsonb) to service_role;
grant execute on function public.tf_list_posts(uuid, uuid, text, text, uuid, text, boolean, int, timestamptz, uuid) to service_role;
grant execute on function public.tf_get_post(uuid, uuid, uuid) to service_role;
grant execute on function public.tf_update_post(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.tf_close_post(uuid, uuid, uuid) to service_role;
grant execute on function public.tf_create_request(uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.tf_list_requests(uuid, uuid, uuid, text, int, timestamptz, uuid) to service_role;
grant execute on function public.tf_list_my_requests(uuid, uuid, text, int, timestamptz, uuid) to service_role;
grant execute on function public.tf_decide_request(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.tf_withdraw_request(uuid, uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Reports can now target team posts (RPT-01..03). The three functions are the Day 4 ones, extended.
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
  else
    -- Projects can be reported when their table exists.
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
    else null end;
  -- Nobody handles a report about themselves.
  if v_owner is not null and v_owner = p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select m.role into v_actor_role from public.memberships m where m.user_id = p_actor and m.college_id = p_college;
  select c.name into v_college_name from public.colleges c where c.id = p_college;

  if p_action = 'hide' then
    if v_rep.target_type = 'announcement' then
      update public.announcements set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'team_post' then
      update public.team_posts set moderation_hidden_at = now() where id = v_rep.target_id and college_id = p_college;
    elsif v_rep.target_type = 'profile' then
      update public.memberships set profile_hidden_at = now() where user_id = v_rep.target_id and college_id = p_college;
    else
      raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
    end if;
    if v_owner is not null then
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

