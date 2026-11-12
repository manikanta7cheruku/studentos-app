-- Migration: photos on market and lost and found posts (R3-D22, decision D-42).
--   A post can have one photo. The phone shrinks it first (about 1080 pixels wide, WebP, usually 100 to 250 KB), so storage
--   stays small. The file lives in Storage (the `post-photos` bucket); the database keeps only its path. The path must start
--   with the person's own id, so nobody can attach somebody else's file.
-- Same rule as the earlier tables: only the server (service role) calls the functions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-photos', 'post-photos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.board_posts add column photo_path text;
alter table public.board_posts add constraint board_posts_photo_path_length check (photo_path is null or char_length(photo_path) <= 200);

-- Same function as before with one more key (photo_path).
create or replace function public.board_json(p_post uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'board', b.board,
    'kind', b.kind,
    'title', b.title,
    'description', b.description,
    'place', b.place,
    'price_inr', b.price_inr,
    'photo_path', b.photo_path,
    'status', b.status,
    'created_at', b.created_at,
    'is_owner', b.author_id = p_actor,
    'my_message_count', (select count(*) from public.board_messages m
                          where m.post_id = b.id and (m.from_user = p_actor or m.to_user = p_actor)),
    'author', jsonb_build_object('user_id', b.author_id, 'display_name', coalesce(pr.display_name, 'Former member'))
  )
  from public.board_posts b
  left join public.profiles pr on pr.user_id = b.author_id
  where b.id = p_post;
$$;

-- The author attaches (or removes, with null) the photo of their post. The path must start with their own id.
create function public.board_set_photo(p_actor uuid, p_college uuid, p_post uuid, p_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.board_posts;
begin
  perform public.tf_assert_member(p_actor, p_college, true);
  select * into v_post from public.board_posts b where b.id = p_post and b.college_id = p_college and b.status <> 'removed' for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_post.author_id <> p_actor then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_path is not null and (left(p_path, 37) <> p_actor::text || '/' or char_length(p_path) > 200 or p_path ~ '\.\.') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.board_posts set photo_path = p_path where id = p_post;
  return public.board_json(p_post, p_actor);
end;
$$;

revoke all on function public.board_set_photo(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.board_set_photo(uuid, uuid, uuid, text) to service_role;
