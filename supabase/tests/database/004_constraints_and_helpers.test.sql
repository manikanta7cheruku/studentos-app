-- Data rules (checks, unique keys, last-admin guard) and the RLS helper functions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ===== colleges ==============================================================
select throws_ok($$insert into public.colleges (slug, name) values ('admin', 'Reserved')$$, '23514', null, 'a reserved slug is rejected');
select throws_ok($$insert into public.colleges (slug, name) values ('Upper-Case', 'Bad')$$, '23514', null, 'an upper case slug is rejected');
select throws_ok($$insert into public.colleges (slug, name) values ('ab', 'Short')$$, '23514', null, 'a slug under 3 characters is rejected');
select throws_ok($$insert into public.colleges (slug, name) values ('alpha', 'Duplicate')$$, '23505', null, 'a duplicate slug is rejected');
select throws_ok($$insert into public.colleges (slug, name, accent_hex) values ('gamma', 'Gamma', 'blue')$$, '23514', null, 'a bad accent colour is rejected');
select throws_ok($$insert into public.colleges (slug, name, status) values ('gamma', 'Gamma', 'open')$$, '23514', null, 'an unknown status is rejected');

select lives_ok($$insert into public.colleges (id, slug, name) values ('cccccccc-0000-4000-8000-000000000001', 'gamma', 'Gamma College')$$, 'a valid college can be inserted');
select is((select count(*) from public.college_settings where college_id = 'cccccccc-0000-4000-8000-000000000001'), 1::bigint, 'inserting a college creates its settings row');
select is((select require_admin_approval from public.college_settings where college_id = 'cccccccc-0000-4000-8000-000000000001'), true, 'default settings require admin approval');

update public.colleges set created_at = '2000-01-01' where id = 'cccccccc-0000-4000-8000-000000000001';
select ok((select updated_at > created_at from public.colleges where id = 'cccccccc-0000-4000-8000-000000000001'), 'updated_at moves forward on update');

-- ===== college_domains =======================================================
select throws_ok($$insert into public.college_domains (college_id, domain) values ('cccccccc-0000-4000-8000-000000000001', 'alpha.test')$$, '23505', null, 'one domain cannot belong to two colleges');
select throws_ok($$insert into public.college_domains (college_id, domain) values ('cccccccc-0000-4000-8000-000000000001', '@gamma.test')$$, '23514', null, 'a domain with @ is rejected');
select throws_ok($$insert into public.college_domains (college_id, domain) values ('cccccccc-0000-4000-8000-000000000001', 'Gamma.Test')$$, '23514', null, 'an upper case domain is rejected');
select throws_ok($$insert into public.college_domains (college_id, domain) values ('cccccccc-0000-4000-8000-000000000001', 'localhost')$$, '23514', null, 'a domain without a dot is rejected');

-- ===== college_settings ======================================================
select throws_ok($$update public.college_settings set allowed_methods = array['sms'] where college_id = 'cccccccc-0000-4000-8000-000000000001'$$, '23514', null, 'an unknown join method is rejected');
select throws_ok($$update public.college_settings set allowed_methods = '{}' where college_id = 'cccccccc-0000-4000-8000-000000000001'$$, '23514', null, 'at least one join method is required');
select throws_ok($$update public.college_settings set features = '[]'::jsonb where college_id = 'cccccccc-0000-4000-8000-000000000001'$$, '23514', null, 'features must be a JSON object');

-- ===== profiles and memberships ==============================================
select throws_ok($$update public.profiles set handle = 'Bad Handle!' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'$$, '23514', null, 'a bad handle is rejected');
select throws_ok($$update public.profiles set handle = 'riya_beta' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'$$, '23505', null, 'a handle is unique across colleges');
select throws_ok($$update public.memberships set verification_level = 0 where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'$$, '23514', null, 'an active member needs level 1 or more');
select throws_ok($$update public.memberships set role = 'owner' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'$$, '23514', null, 'an unknown role is rejected');
select throws_ok($$insert into public.memberships (user_id, college_id) values ('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001')$$, '23505', null, 'one membership per user and college');

-- ===== last admin guard ======================================================
select throws_ok($$update public.memberships set role = 'student' where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'$$, '23514', 'a college must keep at least one active admin', 'the last admin cannot be demoted');
select throws_ok($$update public.memberships set status = 'suspended' where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'$$, '23514', 'a college must keep at least one active admin', 'the last admin cannot be suspended');
select throws_ok($$delete from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'$$, '23514', 'a college must keep at least one active admin', 'the last admin cannot be removed');

-- With a second admin, the first can step down.
update public.memberships set role = 'college_admin' where user_id = 'aaaaaaaa-1000-4000-8000-000000000002';
select lives_ok($$update public.memberships set role = 'student' where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'$$, 'an admin can step down when another admin exists');

-- ===== helper functions ======================================================
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000005'); -- student3, level 1
select results_eq(
  $$select * from public.auth_member_colleges()$$,
  $$values ('aaaaaaaa-0000-4000-8000-000000000001'::uuid)$$,
  'auth_member_colleges() returns only the caller college'
);
select is((select count(*) from public.auth_member_colleges(2)), 0::bigint, 'a level 1 member is not returned for min_level 2');

select * from finish();
rollback;
