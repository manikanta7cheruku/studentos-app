-- Migration: delete my account (AUTH-04), leave a college (TEN-07), view one classmate (PRF-06). R2-D9-2.
-- Same rules as the other server functions: the service role calls them, each one checks the actor again.

-- ---------------------------------------------------------------------------
-- AUTH-04. Names of the colleges where this person is the only active admin. They must make someone else admin
-- first, otherwise a college would be left with nobody in charge.
-- ---------------------------------------------------------------------------
create function public.account_blockers(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(c.name order by c.name), '[]'::jsonb)
  from public.memberships m
  join public.colleges c on c.id = m.college_id
  where m.user_id = p_user and m.role = 'college_admin' and m.status = 'active'
    and not exists (
      select 1 from public.memberships o
      where o.college_id = m.college_id and o.role = 'college_admin' and o.status = 'active' and o.user_id <> p_user
    );
$$;

-- Called just before the account is removed. One audit row per college the person belonged to (the user id stays in
-- the audit log as an anonymous number; the name and email go with the account). Returns how many rows it wrote.
create function public.account_delete_prepare(p_user uuid, p_request_id text default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count int := 0;
begin
  if jsonb_array_length(public.account_blockers(p_user)) > 0 then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;
  for v_row in
    select m.college_id, m.role, m.status from public.memberships m where m.user_id = p_user
  loop
    perform public.write_audit_log(v_row.college_id, p_user, v_row.role, 'account.deleted', 'user', p_user::text,
      jsonb_build_object('membership_status', v_row.status), p_request_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- TEN-07. Leave a college. Active or waiting members only: a suspended or rejected person cannot "leave" to wash
-- the record. Open team posts of the person are closed, their requests are withdrawn (accepted ones free the slot),
-- and the last admin of a college cannot leave (the database refuses, see LAST_ADMIN).
-- ---------------------------------------------------------------------------
create function public.leave_college(p_actor uuid, p_slug text, p_request_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.memberships;
  v_college uuid;
  v_post record;
  v_req record;
begin
  select c.id into v_college from public.colleges c where c.slug = p_slug;
  if v_college is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_membership from public.memberships m
  where m.user_id = p_actor and m.college_id = v_college for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_membership.status in ('suspended', 'rejected') then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_membership.status = 'left' then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  if v_membership.status = 'active' then
    -- accepted team seats are given back, waiting requests are withdrawn, open posts are closed
    for v_req in
      select j.id from public.join_requests j
      where j.applicant_id = p_actor and j.college_id = v_college and j.status = 'accepted'
    loop
      perform public.tf_withdraw_request(p_actor, v_college, v_req.id, p_request_id);
    end loop;
    update public.join_requests set status = 'withdrawn', decided_at = now()
    where applicant_id = p_actor and college_id = v_college and status = 'pending';
    for v_post in
      select t.id from public.team_posts t where t.author_id = p_actor and t.college_id = v_college and t.status = 'open'
    loop
      perform public.tf_close_post(p_actor, v_college, v_post.id);
    end loop;
  else
    update public.verification_requests set status = 'cancelled', decided_at = now()
    where membership_id = v_membership.id and status = 'pending';
  end if;

  update public.memberships
  set status = 'left', status_reason = 'Left by the member', status_changed_by = p_actor
  where id = v_membership.id;

  perform public.write_audit_log(v_college, p_actor, v_membership.role, 'member.left', 'membership',
    v_membership.id::text, jsonb_build_object('was', v_membership.status), p_request_id);
  return jsonb_build_object('id', v_membership.id, 'status', 'left');
end;
$$;

-- ---------------------------------------------------------------------------
-- PRF-06. One classmate's profile. Same visibility rule as the people directory: both are active members of the
-- college, the profile is not hidden (by the person or by a moderator), not deleted, and nobody blocked the other.
-- You can always see your own.
-- ---------------------------------------------------------------------------
create function public.profile_view(p_actor uuid, p_college uuid, p_target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  select jsonb_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'handle', p.handle,
    'headline', p.headline,
    'bio', p.bio,
    'avatar_path', p.avatar_path,
    'interests', to_jsonb(coalesce(p.interests, '{}'::text[])),
    'career_goal', p.career_goal,
    'program', m.program,
    'grad_year', m.grad_year,
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'level', us.level) order by us.level desc, s.name)
      from public.user_skills us join public.skills s on s.id = us.skill_id
      where us.user_id = p.user_id
    ), '[]'::jsonb),
    'is_self', p.user_id = p_actor
  ) into v_result
  from public.profiles p
  join public.memberships m on m.user_id = p.user_id and m.college_id = p_college
  where p.user_id = p_target
    and m.status = 'active'
    and p.deleted_at is null
    and (
      p.user_id = p_actor
      or (p.visibility = 'college' and m.profile_hidden_at is null and not public.is_blocked_between(p_actor, p.user_id))
    );
  if v_result is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_result;
end;
$$;

revoke all on function public.account_blockers(uuid) from public, anon, authenticated;
revoke all on function public.account_delete_prepare(uuid, text) from public, anon, authenticated;
revoke all on function public.leave_college(uuid, text, text) from public, anon, authenticated;
revoke all on function public.profile_view(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.account_blockers(uuid) to service_role;
grant execute on function public.account_delete_prepare(uuid, text) to service_role;
grant execute on function public.leave_college(uuid, text, text) to service_role;
grant execute on function public.profile_view(uuid, uuid, uuid) to service_role;
