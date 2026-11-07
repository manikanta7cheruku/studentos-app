-- PRF-05 people directory (found broken in review of PR 25: profiles and memberships have no direct
-- relationship, so the embedded query always failed with 503; and memberships are private by RLS).
-- This function runs as the signed-in person (auth.uid()), checks they are an active member of the college,
-- and returns only visible classmates: profile visible, not deleted, profile not hidden by a moderator,
-- membership active, and nobody blocked the other.
create function public.directory_list(p_college uuid, p_q text default null, p_limit int default 50)
returns table (user_id uuid, display_name text, handle text, headline text, avatar_path text, interests text[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.display_name, p.handle, p.headline, p.avatar_path, p.interests
  from public.memberships m
  join public.profiles p on p.user_id = m.user_id
  where m.college_id = p_college
    and m.status = 'active'
    and m.profile_hidden_at is null
    and p.visibility = 'college'
    and p.deleted_at is null
    and p_college in (select public.auth_member_colleges(1))
    and not public.is_blocked_between((select auth.uid()), p.user_id)
    and (
      p_q is null
      or btrim(p_q) = ''
      or p.display_name ilike '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by lower(p.display_name), p.user_id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.directory_list(uuid, text, int) from public, anon;
grant execute on function public.directory_list(uuid, text, int) to authenticated, service_role;
