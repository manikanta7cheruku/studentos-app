-- Migration: a chat stays in the list when its messages have disappeared.
-- Messages disappear (1 hour after they are opened, 3 days if never opened) but the conversation with the person stays, so
-- people can write again without hunting for them. The list now also says how many messages are still there, and the order of
-- the list follows the last time anything was said, even when what was said has gone.

alter table public.dm_threads add column if not exists last_activity_at timestamptz not null default now();

update public.dm_threads t
   set last_activity_at = coalesce(
     (select max(m.created_at) from public.dm_messages m where m.thread_id = t.id),
     t.decided_at, t.requested_at, t.created_at);

create function public.dm_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dm_threads set last_activity_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;
revoke all on function public.dm_touch() from public, anon, authenticated;

create trigger dm_messages_touch after insert on public.dm_messages
  for each row execute function public.dm_touch();

drop function public.dm_inbox(uuid, uuid);
create function public.dm_inbox(p_actor uuid, p_college uuid)
returns table (
  other_id uuid, other_name text, other_avatar_path text, unread int, last_at timestamptz,
  status text, requester_id uuid, request_expires_at timestamptz, decided_at timestamptz, message_count int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.tf_assert_member(p_actor, p_college, false);
  return query
    select o.other, coalesce(pr.display_name, 'Former member'), pr.avatar_path,
           (select count(*)::int from public.dm_messages m
             where m.thread_id = t.id and m.sender_id <> p_actor and m.opened_at is null and m.expires_at > now()),
           t.last_activity_at,
           public.dm_effective(t), t.requester_id, t.request_expires_at, t.decided_at,
           (select count(*)::int from public.dm_messages m where m.thread_id = t.id and m.expires_at > now())
    from public.dm_threads t
    cross join lateral (select case when t.user_a = p_actor then t.user_b else t.user_a end as other) o
    left join public.profiles pr on pr.user_id = o.other
    where t.college_id = p_college and p_actor in (t.user_a, t.user_b)
      and not public.is_blocked_between(p_actor, o.other)
      and (
        -- A chat that was accepted stays, whether or not any message is left.
        public.dm_effective(t) = 'accepted'
        or public.dm_effective(t) = 'pending'
        -- The person who asked sees how it ended for 5 days.
        or (public.dm_effective(t) in ('declined', 'expired') and t.requester_id = p_actor
            and coalesce(t.decided_at, t.request_expires_at) > now() - interval '5 days')
      )
    order by 5 desc;
end;
$$;

revoke all on function public.dm_inbox(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dm_inbox(uuid, uuid) to service_role;
