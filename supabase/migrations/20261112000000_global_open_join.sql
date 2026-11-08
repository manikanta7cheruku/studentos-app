-- Global space and the "open" join method (TEN-09).
--
-- Not every student has a college on StudentOS, or a college email. "Global" is one special college that anyone
-- who is signed in can join at once. A Global member is NOT verified (level 1), so the platform limits what they
-- can do (posting limits, no marketplace or notes). Only the Global college may use the "open" method; a normal
-- college admin cannot switch it on.
--
-- Rollback (by hand):
--   drop function public.submit_open_join(uuid, text, text);
--   drop trigger college_settings_open_only_global on public.college_settings;
--   drop function public.college_settings_open_only_global();
--   delete from public.colleges where slug = 'global';
--   then put the two checks back without 'open'.

-- 1. The new method is allowed in the two checks.
alter table public.college_settings drop constraint college_settings_methods_valid;
alter table public.college_settings add constraint college_settings_methods_valid check (
  cardinality(allowed_methods) >= 1
  and allowed_methods <@ array['email_domain', 'invite_code', 'manual', 'roster', 'open']
);

alter table public.memberships drop constraint memberships_method_valid;
alter table public.memberships add constraint memberships_method_valid check (
  verification_method is null
  or verification_method in ('email_domain', 'invite_code', 'manual', 'roster', 'open')
);

-- 2. Only the Global college may use "open".
create function public.college_settings_open_only_global()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if 'open' = any (new.allowed_methods)
     and not exists (select 1 from public.colleges c where c.id = new.college_id and c.slug = 'global') then
    raise exception 'The open join method is only for the Global college' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger college_settings_open_only_global
  before insert or update of allowed_methods on public.college_settings
  for each row execute function public.college_settings_open_only_global();

-- 3. The Global college. Its settings row is created by the trigger on colleges, then set here.
-- 'global' was not in the reserved slug list, so the normal slug rules apply.
insert into public.colleges (id, slug, name, short_name, city, state, status, accent_hex)
values ('eeeeeeee-0000-4000-8000-000000000001', 'global', 'StudentOS Global', 'Global', null, null, 'active', '#2340C8')
on conflict (slug) do nothing;

update public.college_settings
set allowed_methods = array['open'],
    require_admin_approval = false,
    min_level_to_post = 1,
    features = jsonb_build_object('campus', false, 'collaborate', true, 'career', true)
where college_id = (select id from public.colleges where slug = 'global');

-- 4. TEN-09: join Global at once, as an unverified (level 1) active member.
create function public.submit_open_join(p_user uuid, p_slug text, p_request_id text default null)
returns table (membership_id uuid, status text, verification_level smallint, verification_method text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_college uuid;
  v_reusable uuid;
  v_membership uuid;
begin
  select p.college_id, p.reusable_membership_id into v_college, v_reusable
  from public.join_prepare(p_user, p_slug, 'open') p;

  begin
    v_membership := public.join_write_membership(p_user, v_college, v_reusable, 'active', 1::smallint, 'open');
  exception when unique_violation then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end;

  perform public.write_audit_log(
    v_college, p_user, 'student', 'member.joined', 'membership', v_membership::text,
    jsonb_build_object('method', 'open'), p_request_id
  );

  return query select v_membership, 'active'::text, 1::smallint, 'open'::text;
end;
$$;

revoke all on function public.submit_open_join(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_open_join(uuid, text, text) to service_role;
revoke all on function public.college_settings_open_only_global() from public, anon, authenticated;
