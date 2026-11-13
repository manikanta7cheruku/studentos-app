-- Migration: the owner dashboard can see everything about a user (R3-D30, decision D-53).
-- The owner of the platform runs the service, so the Users page shows the whole record of a person: login, profile, college,
-- branch, year, gender, birth year, number, interests, spaces and what they contributed. Only the server (service role) calls
-- this, and only for a signed in owner who has unlocked the dashboard with the PIN. Every visit is written to the audit log.

create function public.owner_users_full(p_q text, p_limit int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_like text;
begin
  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return coalesce((
    select jsonb_agg(x.item order by x.created desc)
    from (
      select u.created_at as created, jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'suspended', (u.banned_until is not null and u.banned_until > now()),
        'platform_admin', exists (select 1 from public.platform_admins a where a.user_id = u.id),
        'spaces', coalesce((
          select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'role', m.role, 'status', m.status) order by c.name)
          from public.memberships m join public.colleges c on c.id = m.college_id
          where m.user_id = u.id
        ), '[]'::jsonb),
        'profile', jsonb_build_object(
          'display_name', p.display_name, 'handle', p.handle, 'headline', p.headline, 'bio', p.bio,
          'college_name', p.college_name, 'branch', p.branch, 'grad_year', p.grad_year,
          'interests', coalesce(p.interests, '{}'::text[]), 'tech_interests', coalesce(p.tech_interests, '{}'::text[]),
          'excited_by', p.excited_by, 'visibility', p.visibility),
        'private', jsonb_build_object(
          'sex', pp.sex, 'sex_public', coalesce(pp.sex_public, false),
          'birth_year', pp.birth_year, 'age_public', coalesce(pp.age_public, false),
          'phone', pp.phone, 'phone_visibility', coalesce(pp.phone_visibility, 'hidden')),
        'counts', public.profile_contributions(u.id)
                  || jsonb_build_object('followers', (select count(*) from public.follows f where f.followee_id = u.id))
      ) as item
      from auth.users u
      left join public.profiles p on p.user_id = u.id
      left join public.profile_private pp on pp.user_id = u.id
      where v_q is null
         or u.email ilike v_like or p.display_name ilike v_like or p.handle ilike v_like
         or p.college_name ilike v_like or p.branch ilike v_like
      order by u.created_at desc
      limit least(greatest(p_limit, 1), 200)
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.owner_users_full(text, int) from public, anon, authenticated;
grant execute on function public.owner_users_full(text, int) to service_role;
