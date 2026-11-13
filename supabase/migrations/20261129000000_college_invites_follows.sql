-- Migration: college, branch and year on the profile; invite links; following people (R3-D27, decisions D-46 to D-48).
--   1. A profile says which college the person is from (typed by them), their branch and the year they graduate. Global is
--      open to everyone, so this is how people tell where each other come from. Classmates can read these three columns
--      like the rest of the profile.
--   2. Every person has an invite code. When a new person signs up through that link, the invitation is recorded once.
--   3. Following is one way and needs no approval.
-- Same rule as the earlier tables: closed tables, only the server (service role) calls the functions.

alter table public.profiles
  add column college_name text,
  add column branch text,
  add column grad_year smallint,
  add constraint profiles_college_name_length check (college_name is null or char_length(college_name) between 2 and 120),
  add constraint profiles_branch_length check (branch is null or char_length(branch) between 1 and 60),
  add constraint profiles_grad_year_range check (grad_year is null or grad_year between 2000 and 2100);

-- People change their own profile through the API with their own rights, and that table lists the columns they may write.
grant insert (college_name, branch, grad_year) on public.profiles to authenticated;
grant update (college_name, branch, grad_year) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Invite codes
-- ---------------------------------------------------------------------------
create table public.user_invite_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  constraint user_invite_codes_code_format check (code ~ '^[a-z0-9]{8}$')
);

create table public.referrals (
  invitee_id uuid primary key references auth.users (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referrals_not_self check (invitee_id <> inviter_id)
);
create index referrals_inviter_idx on public.referrals (inviter_id);

alter table public.user_invite_codes enable row level security;
alter table public.referrals enable row level security;
create policy user_invite_codes_no_client_access on public.user_invite_codes for select to authenticated using (false);
create policy referrals_no_client_access on public.referrals for select to authenticated using (false);
revoke all on public.user_invite_codes from anon, authenticated;
revoke all on public.referrals from anon, authenticated;

-- My code (made the first time it is asked for) and how many people joined through it.
create function public.invite_info(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  select c.code into v_code from public.user_invite_codes c where c.user_id = p_user;
  if v_code is null then
    loop
      v_code := substr(md5(random()::text || clock_timestamp()::text || p_user::text), 1, 8);
      begin
        insert into public.user_invite_codes (user_id, code) values (p_user, v_code);
        exit;
      exception when unique_violation then
        -- Either this person got a code at the same moment, or the code is taken: look again, or try another.
        select c.code into v_code from public.user_invite_codes c where c.user_id = p_user;
        exit when v_code is not null;
      end;
    end loop;
  end if;
  return jsonb_build_object(
    'code', v_code,
    'invited', (select count(*) from public.referrals r where r.inviter_id = p_user)
  );
end;
$$;

-- Records that p_user joined through a code. Once only, never for yourself, an unknown code does nothing.
create function public.referral_apply(p_user uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inviter uuid;
begin
  select c.user_id into v_inviter from public.user_invite_codes c where c.code = lower(btrim(p_code));
  if v_inviter is null or v_inviter = p_user then
    return false;
  end if;
  insert into public.referrals (invitee_id, inviter_id) values (p_user, v_inviter) on conflict do nothing;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Following
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;
create policy follows_no_client_access on public.follows for select to authenticated using (false);
revoke all on public.follows from anon, authenticated;

create function public.follow_info(p_target uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'followers', (select count(*) from public.follows f where f.followee_id = p_target),
    'following', (select count(*) from public.follows f where f.follower_id = p_target),
    'i_follow', exists (select 1 from public.follows f where f.follower_id = p_actor and f.followee_id = p_target)
  );
$$;

-- Follow (p_on true) or stop following. Safe to repeat. Not yourself, not someone who blocked you or whom you blocked.
create function public.follow_set(p_actor uuid, p_target uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor = p_target then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles pr where pr.user_id = p_target and pr.deleted_at is null) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_on then
    if public.is_blocked_between(p_actor, p_target) then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
    insert into public.follows (follower_id, followee_id) values (p_actor, p_target) on conflict do nothing;
  else
    delete from public.follows where follower_id = p_actor and followee_id = p_target;
  end if;
  return public.follow_info(p_target, p_actor);
end;
$$;

revoke all on function public.invite_info(uuid) from public, anon, authenticated;
revoke all on function public.referral_apply(uuid, text) from public, anon, authenticated;
revoke all on function public.follow_info(uuid, uuid) from public, anon, authenticated;
revoke all on function public.follow_set(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.invite_info(uuid) to service_role;
grant execute on function public.referral_apply(uuid, text) to service_role;
grant execute on function public.follow_info(uuid, uuid) to service_role;
grant execute on function public.follow_set(uuid, uuid, boolean) to service_role;
