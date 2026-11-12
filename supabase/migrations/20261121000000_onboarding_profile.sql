-- Migration: onboarding and a richer profile (R3-D19, decision D-39).
--   1. Two kinds of interests: `interests` (casual: football, movies, music) and `tech_interests` (technical), and one
--      line about what excites the person. These are public to the college like the rest of the profile.
--   2. Private details live in their own closed table, `profile_private`: sex (with "prefer not to say"), birth year,
--      and an optional mobile number with a visibility choice. `profiles` is readable by classmates through row level
--      security, so nothing sensitive may be added there.
--   3. The mobile number is shown only to the host of a plan the person joined, only if they chose "hosts", and only until a
--      day after the plan. Nobody else ever sees it. It is not verified yet (a code by SMS comes later).
-- Same rule as the earlier tables: RLS is on, the only policy says "no", and only the server (service role) calls the
-- functions.

-- ---------------------------------------------------------------------------
-- 1. Interests and the one line
-- ---------------------------------------------------------------------------
alter table public.profiles add column tech_interests text[] not null default '{}';
alter table public.profiles add column excited_by text;
alter table public.profiles add constraint profiles_tech_interests_count check (cardinality(tech_interests) <= 20);
alter table public.profiles add constraint profiles_excited_by_length check (excited_by is null or char_length(excited_by) <= 200);
grant insert (tech_interests, excited_by) on public.profiles to authenticated;
grant update (tech_interests, excited_by) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Private details
-- ---------------------------------------------------------------------------
create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text,
  birth_year smallint,
  phone text,
  phone_visibility text not null default 'hidden',
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_private_sex_valid check (sex is null or sex in ('woman', 'man', 'non_binary', 'prefer_not_to_say')),
  constraint profile_private_birth_year_range check (birth_year is null or birth_year between 1940 and 2030),
  constraint profile_private_phone_format check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profile_private_phone_visibility_valid check (phone_visibility in ('hidden', 'hosts'))
);
create trigger profile_private_set_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

alter table public.profile_private enable row level security;
create policy profile_private_no_client_access on public.profile_private for select to authenticated using (false);
revoke all on public.profile_private from anon, authenticated;

create function public.profile_private_get(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('sex', pp.sex, 'birth_year', pp.birth_year, 'phone', pp.phone,
                               'phone_visibility', pp.phone_visibility)
       from public.profile_private pp where pp.user_id = p_user),
    jsonb_build_object('sex', null, 'birth_year', null, 'phone', null, 'phone_visibility', 'hidden')
  );
$$;

-- Changes only the keys that are in the patch. A key set to null clears it. A new number is unverified again.
create function public.profile_private_set(p_user uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or not exists (select 1 from public.profiles pr where pr.user_id = p_user) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.profile_private (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.profile_private
     set sex = case when p_patch ? 'sex' then nullif(p_patch ->> 'sex', '') else sex end,
         birth_year = case when p_patch ? 'birth_year' then (p_patch ->> 'birth_year')::smallint else birth_year end,
         phone = case when p_patch ? 'phone' then nullif(btrim(p_patch ->> 'phone'), '') else phone end,
         phone_verified_at = case when p_patch ? 'phone' then null else phone_verified_at end,
         phone_visibility = case when p_patch ? 'phone_visibility' then p_patch ->> 'phone_visibility' else phone_visibility end
   where user_id = p_user;
  return public.profile_private_get(p_user);
end;
$$;

revoke all on function public.profile_private_get(uuid) from public, anon, authenticated;
revoke all on function public.profile_private_set(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.profile_private_get(uuid) to service_role;
grant execute on function public.profile_private_set(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3. The host sees the number of a person who chose to share it
-- ---------------------------------------------------------------------------
-- Same function as before with one more key (phone). Only the host of the plan gets a number, and only for a person who
-- chose "hosts", and only until a day after the plan (its time, or 30 days after it was posted when it has no time).
create or replace function public.tf_participants(p_actor uuid, p_college uuid, p_post uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.team_posts;
  v_in boolean;
  v_share boolean;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select * into v_post from public.team_posts p where p.id = p_post and p.college_id = p_college;
  if not found or not public.tf_can_see(p_actor, v_post) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  v_in := v_post.author_id = p_actor or exists (
    select 1 from public.join_requests j where j.post_id = p_post and j.applicant_id = p_actor and j.status = 'accepted');
  if not v_in then
    return '[]'::jsonb;
  end if;
  v_share := v_post.author_id = p_actor
    and now() < coalesce(v_post.deadline, v_post.created_at + interval '30 days') + interval '24 hours';
  return (
    select coalesce(jsonb_agg(x.item order by x.ord, x.ts), '[]'::jsonb)
    from (
      select 0 as ord, v_post.created_at as ts,
        jsonb_build_object('user_id', v_post.author_id, 'display_name', coalesce(pr.display_name, 'Former member'),
                           'role_name', 'Host', 'joined_at', v_post.created_at, 'is_host', true, 'phone', null) as item
      from (select 1) as one
      left join public.profiles pr on pr.user_id = v_post.author_id
      union all
      select 1, coalesce(j.decided_at, j.created_at),
        jsonb_build_object('user_id', j.applicant_id, 'display_name', coalesce(pr.display_name, 'Former member'),
                           'role_name', r.role_name, 'joined_at', coalesce(j.decided_at, j.created_at), 'is_host', false,
                           'phone', case when v_share and pp.phone_visibility = 'hosts' then pp.phone else null end)
      from public.join_requests j
      join public.team_post_roles r on r.id = j.role_id
      left join public.profiles pr on pr.user_id = j.applicant_id
      left join public.profile_private pp on pp.user_id = j.applicant_id
      where j.post_id = p_post and j.status = 'accepted'
    ) x
  );
end;
$$;
