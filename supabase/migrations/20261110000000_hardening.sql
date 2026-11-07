-- Migration: hardening (R2-D8-1). Follow-ups from the review of PR 25 (profile) and security check 2.
-- 1. The avatars bucket exists, is limited to 2 MB and to real image types (also for signed upload links),
--    and a person can only write inside their own folder (the user id).
-- 2. Saving the skill list is one transaction.

-- ---------------------------------------------------------------------------
-- Storage: the avatars bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_insert_own_folder on storage.objects;
create policy avatars_insert_own_folder on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_update_own_folder on storage.objects;
create policy avatars_update_own_folder on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete_own_folder on storage.objects;
create policy avatars_delete_own_folder on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- PRF-02: replace my skills in one transaction. Runs as the signed-in person (security invoker),
-- so row level security still decides, and a failure in any row leaves the old list as it was.
-- ---------------------------------------------------------------------------
create function public.set_my_skills(p_skills jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_skills is null or jsonb_typeof(p_skills) <> 'array' then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  delete from public.user_skills where user_id = (select auth.uid());
  insert into public.user_skills (user_id, skill_id, level, evidence_url)
  select (select auth.uid()), (e ->> 'skill_id')::uuid, (e ->> 'level')::smallint, nullif(e ->> 'evidence_url', '')
  from jsonb_array_elements(p_skills) e;
end;
$$;

revoke all on function public.set_my_skills(jsonb) from public, anon;
grant execute on function public.set_my_skills(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Speed: the Team Finder list checked visibility with a function call for every row of the college (4000 posts took
-- 250 ms for the first page). The same rules are now plain joins and a status test the index can use.
-- ---------------------------------------------------------------------------
create or replace function public.tf_list_posts(
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
      -- same rule as tf_can_see, written so the database can join instead of calling a function for every row
      and p.status <> 'removed'
      and (p.author_id = p_actor or (
            p.moderation_hidden_at is null
            and exists (select 1 from public.memberships m
                        where m.user_id = p.author_id and m.college_id = p.college_id and m.status = 'active')
            and not exists (select 1 from public.blocks b
                            where (b.blocker_id = p_actor and b.blocked_id = p.author_id)
                               or (b.blocker_id = p.author_id and b.blocked_id = p_actor))))
      and (not coalesce(p_mine, false) or p.author_id = p_actor)
      and (p_kind is null or p.kind = p_kind)
      -- same meaning as tf_shown_status, but the database can use the index on (college, status, created_at)
      and (p_status is null
           or (p_status = 'open' and p.status = 'open' and (p.deadline is null or p.deadline > now()))
           or (p_status = 'expired' and (p.status = 'expired' or (p.status = 'open' and p.deadline <= now())))
           or (p_status in ('closed', 'filled', 'removed') and p.status = p_status))
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
