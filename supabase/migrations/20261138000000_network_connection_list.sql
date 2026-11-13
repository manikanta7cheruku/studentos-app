-- Migration: the people I am connected to, in one college (a chat they accepted, or two people who follow each other).
-- Used by the Network page ("My connections" tab). Only active members of the college, never blocked or deleted people.

create function public.network_connection_list(p_actor uuid, p_college uuid)
returns table (
  user_id uuid, display_name text, headline text, avatar_path text,
  college_name text, branch text, grad_year smallint, place text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select pr.user_id, pr.display_name, pr.headline, pr.avatar_path, pr.college_name, pr.branch, pr.grad_year, pr.place
    from public.network_connections(p_actor) c
    join public.profiles pr on pr.user_id = c.other
    join public.memberships m on m.user_id = c.other and m.college_id = p_college and m.status = 'active'
    order by pr.display_name;
end;
$$;

revoke all on function public.network_connection_list(uuid, uuid) from public, anon, authenticated;
grant execute on function public.network_connection_list(uuid, uuid) to service_role;
