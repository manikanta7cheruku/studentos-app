-- Migration: the owner can see who is behind anonymous buzz, comments and debate arguments, and who a report is about.
--   * owner_anonymous: every anonymous buzz, comment and argument with the real person (name, username, email), the college and
--     how many open reports it has. Other people only ever see "Anonymous <animal>".
--   * owner_reports: each report now carries what was reported (a short text), who wrote it (also when it was anonymous),
--     and who filed it.
-- Both are for the platform owner only (service role, called from the owner screens, which check the owner list).

create function public.owner_anonymous(p_q text, p_limit int, p_offset int)
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
  return (
    with found as (
      select x.kind, x.id, x.body, x.status, x.created_at, x.author_id as user_id,
             coalesce(p.display_name, 'Removed account') as name, p.handle, u.email::text as email,
             c.slug as college_slug, c.name as college_name,
             (select count(*)::int from public.reports r where r.target_id = x.id and r.target_type = x.rtype and r.status = 'open') as open_reports
      from (
        select 'buzz'::text as kind, 'idea'::text as rtype, i.id, i.college_id, i.author_id, i.status, i.created_at,
               left(btrim(concat_ws(E'\n', nullif(btrim(i.title), ''), i.body)), 300) as body
          from public.ideas i where i.is_anonymous
        union all
        select 'comment', 'idea_comment', m.id, m.college_id, m.author_id, m.status, m.created_at, left(m.body, 300)
          from public.idea_comments m where m.is_anonymous
        union all
        select 'argument', 'debate_argument', a.id, a.college_id, a.author_id, a.status, a.created_at, left(a.body, 300)
          from public.debate_arguments a where a.is_anonymous
      ) x
      join public.colleges c on c.id = x.college_id
      left join public.profiles p on p.user_id = x.author_id
      left join auth.users u on u.id = x.author_id
      where v_q is null or x.body ilike v_like or p.display_name ilike v_like or p.handle ilike v_like or u.email::text ilike v_like
    )
    select jsonb_build_object(
      'total', (select count(*) from found),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (
          select * from found order by created_at desc
          limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
        ) t
      ), '[]'::jsonb)
    )
  );
end;
$$;

drop function public.owner_reports(int);
create function public.owner_reports(p_limit int)
returns table (
  id uuid, college_slug text, college_name text, target_type text, reason text, details text,
  reporter_email text, created_at timestamptz,
  target_id uuid, target_preview text, target_anonymous boolean,
  target_author_id uuid, target_author_name text, target_author_email text, reporter_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, c.slug, c.name, r.target_type, r.reason, r.details, ru.email::text, r.created_at,
         r.target_id, t.preview, coalesce(t.anon, false),
         t.author, ap.display_name, au.email::text, rp.display_name
  from public.reports r
  join public.colleges c on c.id = r.college_id
  left join auth.users ru on ru.id = r.reporter_id
  left join public.profiles rp on rp.user_id = r.reporter_id
  left join lateral (
    select case r.target_type
      when 'idea' then (select jsonb_build_object('preview', left(btrim(concat_ws(E'\n', nullif(btrim(i.title), ''), i.body)), 200), 'author', i.author_id, 'anon', i.is_anonymous) from public.ideas i where i.id = r.target_id)
      when 'idea_comment' then (select jsonb_build_object('preview', left(m.body, 200), 'author', m.author_id, 'anon', m.is_anonymous) from public.idea_comments m where m.id = r.target_id)
      when 'debate_argument' then (select jsonb_build_object('preview', left(a.body, 200), 'author', a.author_id, 'anon', a.is_anonymous) from public.debate_arguments a where a.id = r.target_id)
      when 'debate' then (select jsonb_build_object('preview', d.title, 'author', d.author_id, 'anon', false) from public.debates d where d.id = r.target_id)
      when 'team_post' then (select jsonb_build_object('preview', tp.title, 'author', tp.author_id, 'anon', false) from public.team_posts tp where tp.id = r.target_id)
      when 'event' then (select jsonb_build_object('preview', e.title, 'author', e.author_id, 'anon', false) from public.events e where e.id = r.target_id)
      when 'listing' then (select jsonb_build_object('preview', b.title, 'author', b.author_id, 'anon', false) from public.board_posts b where b.id = r.target_id)
      when 'profile' then (select jsonb_build_object('preview', pp.display_name, 'author', pp.user_id, 'anon', false) from public.profiles pp where pp.user_id = r.target_id)
    end as j
  ) tj on true
  cross join lateral (
    select tj.j ->> 'preview' as preview, nullif(tj.j ->> 'author', '')::uuid as author, (tj.j ->> 'anon')::boolean as anon
  ) t
  left join public.profiles ap on ap.user_id = t.author
  left join auth.users au on au.id = t.author
  where r.status = 'open'
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke all on function public.owner_anonymous(text, int, int) from public, anon, authenticated;
revoke all on function public.owner_reports(int) from public, anon, authenticated;
grant execute on function public.owner_anonymous(text, int, int) to service_role;
grant execute on function public.owner_reports(int) to service_role;
