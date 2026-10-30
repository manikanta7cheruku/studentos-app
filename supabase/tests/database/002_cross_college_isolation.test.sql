-- A member of one college can never read or change another college's rows.
-- Uses the seed users from supabase/seed.sql (all fake).
--   Alpha college: aaaaaaaa-0000-...-0001   Beta college: bbbbbbbb-0000-...-0001
--   user ...1 admin, ...2 moderator, ...3 student1, ...4 student2, ...6 pending, ...7 suspended
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- Sign in as a user for the following statements. Call it while the role is the owner.
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ===== Alpha student =========================================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');

select is((select count(*) from public.colleges), 1::bigint, 'Alpha student sees exactly one college');
select is((select count(*) from public.colleges where slug = 'beta'), 0::bigint, 'Alpha student cannot read the Beta college');
select is((select count(*) from public.college_domains where domain = 'beta.test'), 0::bigint, 'Alpha student cannot read Beta domains');
select is((select count(*) from public.college_settings where college_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 0::bigint, 'Alpha student cannot read Beta settings');
select is((select count(*) from public.memberships), 1::bigint, 'Alpha student sees only their own membership');
select is((select count(*) from public.memberships where college_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 0::bigint, 'Alpha student cannot read Beta memberships');
select is((select count(*) from public.profiles where user_id::text like 'bbbbbbbb%'), 0::bigint, 'Alpha student cannot read Beta profiles');
select is((select count(*) from public.profiles where user_id::text like 'aaaaaaaa%'), 5::bigint, 'Alpha student sees the 5 active Alpha profiles (not pending or suspended)');
select is(
  (select count(*) from public.profiles where display_name = 'Riya Sharma'), 1::bigint,
  'a Beta student with the same display name stays invisible'
);
select is((select count(*) from public.audit_logs), 0::bigint, 'a student cannot read the audit log');

-- Writes from the client are blocked.
select throws_ok(
  $$update public.memberships set role = 'college_admin' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'$$,
  '42501', null, 'a student cannot make themselves admin'
);
select throws_ok(
  $$insert into public.memberships (user_id, college_id, status, verification_level)
    values ('aaaaaaaa-1000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000001', 'active', 2)$$,
  '42501', null, 'a student cannot insert a membership in another college'
);
select throws_ok(
  $$update public.colleges set name = 'Hacked' where slug = 'alpha'$$,
  '42501', null, 'a student cannot rename the college'
);
with changed as (
  update public.college_settings set require_admin_approval = false
  where college_id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1
)
select is((select count(*) from changed), 0::bigint, 'a student cannot change college settings (0 rows)');

-- Own profile: can edit. Another person's profile: update touches 0 rows.
update public.profiles set headline = 'Edited by owner' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003';
select is((select headline from public.profiles where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 'Edited by owner', 'a student can edit their own profile');
with changed as (
  update public.profiles set headline = 'Defaced' where user_id = 'aaaaaaaa-1000-4000-8000-000000000004' returning 1
)
select is((select count(*) from changed), 0::bigint, 'a student cannot edit a classmate profile (0 rows)');
select throws_ok(
  $$insert into public.profiles (user_id, display_name) values ('aaaaaaaa-1000-4000-8000-000000000004', 'Impostor')$$,
  '42501', null, 'a student cannot create a profile for someone else'
);

-- A hidden profile disappears for classmates.
update public.profiles set visibility = 'hidden' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003';
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000004');
select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 0::bigint, 'a hidden profile is not visible to classmates');

-- ===== Alpha admin ===========================================================
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');

select is((select count(*) from public.memberships), 7::bigint, 'Alpha admin sees the 7 Alpha memberships');
select is((select count(*) from public.memberships where college_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 0::bigint, 'Alpha admin cannot read Beta memberships');
select ok((select count(*) from public.audit_logs) >= 1, 'Alpha admin can read the Alpha audit log');
select is((select count(*) from public.audit_logs where college_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 0::bigint, 'Alpha admin cannot read the Beta audit log');

with changed as (
  update public.college_settings set require_admin_approval = false
  where college_id = 'bbbbbbbb-0000-4000-8000-000000000001' returning 1
)
select is((select count(*) from changed), 0::bigint, 'Alpha admin cannot change Beta settings (0 rows)');
with changed as (
  update public.college_settings set require_admin_approval = false
  where college_id = 'aaaaaaaa-0000-4000-8000-000000000001' returning 1
)
select is((select count(*) from changed), 1::bigint, 'Alpha admin can change Alpha settings');
select throws_ok(
  $$update public.college_settings set college_id = 'bbbbbbbb-0000-4000-8000-000000000001' where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null, 'an admin cannot move settings to another college (college_id is not updatable)'
);
select throws_ok(
  $$update public.memberships set role = 'college_admin' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'$$,
  '42501', null, 'even an admin cannot write memberships from the client (server only)'
);

-- ===== Beta admin sees only Beta =============================================
reset role;
select pg_temp.act_as('bbbbbbbb-1000-4000-8000-000000000001');
select is((select count(*) from public.colleges where slug = 'alpha'), 0::bigint, 'Beta admin cannot read the Alpha college');
select is((select count(*) from public.memberships where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'Beta admin cannot read Alpha memberships');
select is((select count(*) from public.audit_logs where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'Beta admin cannot read the Alpha audit log');

-- ===== Pending and suspended users are not members ===========================
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000006');
select is((select count(*) from public.colleges), 0::bigint, 'a pending user sees no college');
select is((select count(*) from public.profiles), 1::bigint, 'a pending user sees only their own profile');
select is((select count(*) from public.memberships), 1::bigint, 'a pending user can read their own membership status');

reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000007');
select is((select count(*) from public.colleges), 0::bigint, 'a suspended user sees no college');

-- ===== Not signed in ========================================================
reset role;
set local role anon;
select throws_ok('select * from public.colleges', '42501', null, 'anon cannot read colleges');
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
