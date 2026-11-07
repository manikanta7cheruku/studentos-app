-- Delete my account, leave a college, view one classmate (migration 20261111000000). Users from supabase/seed.sql:
-- Alpha admin ...0001, moderator ...0002, student1 ...0003, student2 ...0004, student3 ...0005, pending ...0006,
-- suspended ...0007. Beta: admin bbbbbbbb-1000-...-0001, student1 ...0003.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
create temp table t (k text primary key, v uuid);
grant all on t to public;
create function pg_temp.view(p_actor uuid, p_target uuid) returns jsonb language sql as
  $$ select public.profile_view(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', p_target) $$;

-- ===== clients cannot call these ==============================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select public.leave_college('aaaaaaaa-1000-4000-8000-000000000001', 'alpha')$$, '42501', null, 'a signed-in admin cannot call leave_college directly');
select throws_ok($$select public.profile_view('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003')$$, '42501', null, 'nor profile_view');
select throws_ok($$select public.account_delete_prepare('aaaaaaaa-1000-4000-8000-000000000001')$$, '42501', null, 'nor account_delete_prepare');
reset role;

-- ===== PRF-06 profile_view ====================================================
update public.profiles set bio = 'I like databases.', interests = array['sql', 'hiking'] where user_id = 'aaaaaaaa-1000-4000-8000-000000000004';
insert into public.user_skills (user_id, skill_id, level) values ('aaaaaaaa-1000-4000-8000-000000000004', '88888888-8888-4888-8888-888888888892', 4);
select is((pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004') ->> 'display_name'), 'Kabir Rao', 'a classmate sees another classmate');
select is((pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004') -> 'skills' -> 0 ->> 'name'), 'PostgreSQL', 'with their skills');
select is((pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004') ->> 'is_self'), 'false', 'is_self is false for someone else');
select ok(not (pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004') ? 'email'), 'and there is no email address');
select is((pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000003') ->> 'is_self'), 'true', 'you can see yourself');
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'bbbbbbbb-1000-4000-8000-000000000003')$$, 'P0001', 'NOT_FOUND', 'a person of another college is NOT_FOUND');
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', gen_random_uuid())$$, 'P0001', 'NOT_FOUND', 'an unknown id is NOT_FOUND');
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000006')$$, 'P0001', 'NOT_FOUND', 'a pending member is NOT_FOUND');
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000006', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'P0001', 'FORBIDDEN', 'a pending member cannot look at anyone');
select throws_ok($$select pg_temp.view('bbbbbbbb-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'P0001', 'FORBIDDEN', 'nor a member of another college');
update public.profiles set visibility = 'hidden' where user_id = 'aaaaaaaa-1000-4000-8000-000000000004';
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'P0001', 'NOT_FOUND', 'a hidden profile is NOT_FOUND');
select is((pg_temp.view('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-1000-4000-8000-000000000004') ->> 'display_name'), 'Kabir Rao', 'but the owner still sees it');
update public.profiles set visibility = 'college' where user_id = 'aaaaaaaa-1000-4000-8000-000000000004';
update public.memberships set profile_hidden_at = now() where user_id = 'aaaaaaaa-1000-4000-8000-000000000004';
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'P0001', 'NOT_FOUND', 'a profile hidden by a moderator is NOT_FOUND');
update public.memberships set profile_hidden_at = null where user_id = 'aaaaaaaa-1000-4000-8000-000000000004';
select public.block_user('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004');
select throws_ok($$select pg_temp.view('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-1000-4000-8000-000000000003')$$, 'P0001', 'NOT_FOUND', 'a blocked pair cannot see each other, either way');
select public.unblock_user('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000004');

-- ===== TEN-07 leave a college ==================================================
insert into t select 'post', (public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'hackathon', 'Team that will be left behind', 'x', null, null, null,
  '[{"role_name":"Backend developer","slots":1,"skill_ids":[]}]'::jsonb) ->> 'id')::uuid;
insert into t select 'seat', (public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'project', 'Team where student1 sits', 'x', null, null, null,
  '[{"role_name":"Designer","slots":1,"skill_ids":[]}]'::jsonb) ->> 'id')::uuid;
insert into t select 'req1', (public.tf_create_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'post'),
  (select id from public.team_post_roles where post_id = (select v from t where k = 'post')), 'hi') ->> 'id')::uuid;
insert into t select 'req2', (public.tf_create_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'seat'),
  (select id from public.team_post_roles where post_id = (select v from t where k = 'seat')), 'hi') ->> 'id')::uuid;
select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'req2'), 'accepted', null);
select is((select post.status from public.team_posts post where post.id = (select v from t where k = 'seat')), 'filled', 'student1 holds the only seat, the post is filled');

select throws_ok($$select public.leave_college('aaaaaaaa-1000-4000-8000-000000000007', 'alpha')$$, 'P0001', 'FORBIDDEN', 'a suspended member cannot leave (that would wash the record)');
select throws_ok($$select public.leave_college('aaaaaaaa-1000-4000-8000-000000000003', 'no-such-college')$$, 'P0001', 'NOT_FOUND', 'an unknown college is NOT_FOUND');
select throws_ok($$select public.leave_college('aaaaaaaa-1000-4000-8000-000000000003', 'beta')$$, 'P0001', 'NOT_FOUND', 'so is a college you never joined');
select throws_ok($$select public.leave_college('aaaaaaaa-1000-4000-8000-000000000001', 'alpha')$$, '23514', null, 'the only admin cannot leave (the database refuses)');
select is((select m.status from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000001' and m.college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'active', 'and nothing changed for the admin');

select is((public.leave_college('aaaaaaaa-1000-4000-8000-000000000003', 'alpha', 'req-leave1') ->> 'status'), 'left', 'student1 leaves');
select is((select m.status from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and m.college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'left', 'the membership is left');
select is((select status_reason from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'Left by the member', 'with the reason');
select is((select r.status from public.join_requests r where r.id = (select v from t where k = 'req1')), 'withdrawn', 'the waiting request was withdrawn');
select is((select r.status from public.join_requests r where r.id = (select v from t where k = 'req2')), 'withdrawn', 'the accepted seat was given back');
select is((select ro.filled from public.team_post_roles ro where ro.post_id = (select v from t where k = 'seat')), 0::smallint, 'the slot is free again');
select is((select post.status from public.team_posts post where post.id = (select v from t where k = 'seat')), 'open', 'and the post is open again');
select is((select action from public.audit_logs where request_id = 'req-leave1' and action = 'member.left'), 'member.left', 'one audit row member.left');
select throws_ok($$select public.leave_college('aaaaaaaa-1000-4000-8000-000000000003', 'alpha')$$, 'P0001', 'CONFLICT', 'leaving twice is CONFLICT');
select throws_ok($$select public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'seat'))$$, 'P0001', 'FORBIDDEN', 'after leaving the Team Finder is closed to them');

select is((public.leave_college('aaaaaaaa-1000-4000-8000-000000000005', 'alpha') ->> 'status'), 'left', 'student3 leaves');
select is((select post.status from public.team_posts post where post.id = (select v from t where k = 'post')), 'closed', 'their open post was closed');

insert into public.verification_requests (membership_id, college_id, method, status)
select m.id, m.college_id, 'manual', 'pending' from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000006';
select is((public.leave_college('aaaaaaaa-1000-4000-8000-000000000006', 'alpha') ->> 'status'), 'left', 'a pending member can cancel by leaving');
select is((select r.status from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), 'cancelled', 'and the request is cancelled');

-- ===== AUTH-04 delete my account ==============================================
select is(public.account_blockers('aaaaaaaa-1000-4000-8000-000000000001'), '["Alpha College"]'::jsonb, 'the only admin of a college is blocked, with the college name');
select is(public.account_blockers('aaaaaaaa-1000-4000-8000-000000000004'), '[]'::jsonb, 'a student has no blockers');
select throws_ok($$select public.account_delete_prepare('aaaaaaaa-1000-4000-8000-000000000001')$$, 'P0001', 'CONFLICT', 'prepare refuses the only admin');
select is(public.account_delete_prepare('aaaaaaaa-1000-4000-8000-000000000004', 'req-del1'), 1, 'prepare writes one audit row for the one college');
select is((select action from public.audit_logs where request_id = 'req-del1'), 'account.deleted', 'it is account.deleted');
select is((select metadata ->> 'membership_status' from public.audit_logs where request_id = 'req-del1'), 'active', 'with no name or email in it');
select ok(not exists (select 1 from public.audit_logs where request_id = 'req-del1' and metadata::text ~* '@'), 'no email address anywhere in the row');

select * from finish();
rollback;
