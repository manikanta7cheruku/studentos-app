-- Migration: a person can choose to show their gender on their profile (R3-D25, decision D-44).
-- The answer is still stored in the closed table `profile_private` (column `sex`, shown to people as "Gender"). New switch
-- `sex_public`: off by default, so nothing changes for anyone until they turn it on. When it is on, classmates who can see
-- the profile see the gender too. "Prefer not to say" is never shown, even when the switch is on.

alter table public.profile_private add column sex_public boolean not null default false;

create or replace function public.profile_private_get(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('sex', pp.sex, 'sex_public', pp.sex_public, 'birth_year', pp.birth_year, 'phone', pp.phone,
                               'phone_visibility', pp.phone_visibility)
       from public.profile_private pp where pp.user_id = p_user),
    jsonb_build_object('sex', null, 'sex_public', false, 'birth_year', null, 'phone', null, 'phone_visibility', 'hidden')
  );
$$;

create or replace function public.profile_private_set(p_user uuid, p_patch jsonb)
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
         sex_public = case when p_patch ? 'sex_public' then (p_patch ->> 'sex_public')::boolean else sex_public end,
         birth_year = case when p_patch ? 'birth_year' then (p_patch ->> 'birth_year')::smallint else birth_year end,
         phone = case when p_patch ? 'phone' then nullif(btrim(p_patch ->> 'phone'), '') else phone end,
         phone_verified_at = case when p_patch ? 'phone' then null else phone_verified_at end,
         phone_visibility = case when p_patch ? 'phone_visibility' then p_patch ->> 'phone_visibility' else phone_visibility end
   where user_id = p_user;
  return public.profile_private_get(p_user);
end;
$$;

-- What other people may see: the gender, only when the person turned the switch on, and never "prefer not to say".
create function public.profile_public_gender(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pp.sex
  from public.profile_private pp
  where pp.user_id = p_user and pp.sex_public and pp.sex is not null and pp.sex <> 'prefer_not_to_say';
$$;

revoke all on function public.profile_private_get(uuid) from public, anon, authenticated;
revoke all on function public.profile_private_set(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.profile_public_gender(uuid) from public, anon, authenticated;
grant execute on function public.profile_private_get(uuid) to service_role;
grant execute on function public.profile_private_set(uuid, jsonb) to service_role;
grant execute on function public.profile_public_gender(uuid) to service_role;
