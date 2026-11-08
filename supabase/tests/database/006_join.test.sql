-- Joining a college: invite codes, manual requests, college email, the public view.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Fake users for this test (rolled back at the end).
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', ('cccccccc-1000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated',
       'join' || n || '@alpha.test', now(), now(), '', '', '', ''
from generate_series(1, 9) n;

-- Invites: A good, B one use only, C expired, D revoked, E pending grant.
insert into public.invite_codes (college_id, code_hash, label, max_uses, used_count, expires_at, revoked_at, grants_status) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'hash-good-aaaaaaaaaaaa', 'good', 5, 0, now() + interval '1 day', null, 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'hash-one-aaaaaaaaaaaa', 'one use', 1, 0, now() + interval '1 day', null, 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'hash-old-aaaaaaaaaaaa', 'expired', 5, 0, now() - interval '1 day', null, 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'hash-rev-aaaaaaaaaaaa', 'revoked', 5, 0, now() + interval '1 day', now(), 'active'),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'hash-pend-aaaaaaaaaaaa', 'pending grant', 5, 0, now() + interval '1 day', null, 'pending');

-- ===== who can read invite_codes =============================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select is((select count(*) from public.invite_codes), 5::bigint, 'an Alpha admin sees the Alpha invites');
select throws_ok($$select code_hash from public.invite_codes$$, '42501', null, 'an admin cannot read the code hash column');
select throws_ok($$update public.invite_codes set max_uses = 999$$, '42501', null, 'an admin cannot change invites from the client');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');
select is((select count(*) from public.invite_codes), 0::bigint, 'a student sees no invites');
reset role;
select pg_temp.act_as('bbbbbbbb-1000-4000-8000-000000000001');
select is((select count(*) from public.invite_codes), 0::bigint, 'a Beta admin sees no Alpha invites');
select throws_ok($$select public.redeem_invite('cccccccc-1000-4000-8000-000000000001', 'alpha', 'hash-good-aaaaaaaaaaaa')$$, '42501', null, 'a signed-in user cannot call redeem_invite');
reset role;
set local role anon;
select throws_ok($$select * from public.idempotency_keys$$, '42501', null, 'anon cannot read idempotency keys');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select * from public.idempotency_keys$$, '42501', null, 'a signed-in user cannot read idempotency keys');
reset role;

-- ===== redeem_invite (as the server) ========================================
set local role service_role;

select lives_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000001', 'alpha', 'hash-good-aaaaaaaaaaaa', 'req-1')$$, 'a good code works');
reset role;
select is((select status from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000001'), 'active', 'the member is active');
select is((select verification_level from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000001'), 2::smallint, 'an active grant gives level 2');
select is((select used_count from public.invite_codes where code_hash = 'hash-good-aaaaaaaaaaaa'), 1, 'used_count went up by one');
select is(
  (select count(*) from public.audit_logs where action = 'member.joined' and actor_id = 'cccccccc-1000-4000-8000-000000000001' and request_id = 'req-1'),
  1::bigint, 'the join wrote an audit row'
);

set local role service_role;
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000001', 'alpha', 'hash-good-aaaaaaaaaaaa')$$, 'P0001', 'CONFLICT', 'a member cannot redeem again');
reset role;
select is((select used_count from public.invite_codes where code_hash = 'hash-good-aaaaaaaaaaaa'), 1, 'a refused redeem does not use up the invite');

set local role service_role;
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000002', 'alpha', 'hash-nope-aaaaaaaaaaaa')$$, 'P0001', 'INVITE_INVALID', 'an unknown code is INVITE_INVALID');
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000002', 'alpha', 'hash-rev-aaaaaaaaaaaa')$$, 'P0001', 'INVITE_INVALID', 'a revoked code is INVITE_INVALID');
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000002', 'alpha', 'hash-old-aaaaaaaaaaaa')$$, 'P0001', 'INVITE_EXPIRED', 'an old code is INVITE_EXPIRED');
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000002', 'beta', 'hash-good-aaaaaaaaaaaa')$$, 'P0001', 'INVITE_INVALID', 'an Alpha code does not work for Beta');
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000002', 'nope', 'hash-good-aaaaaaaaaaaa')$$, 'P0001', 'NOT_FOUND', 'an unknown college is NOT_FOUND');

select lives_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000002', 'alpha', 'hash-one-aaaaaaaaaaaa')$$, 'the last use works');
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000003', 'alpha', 'hash-one-aaaaaaaaaaaa')$$, 'P0001', 'INVITE_EXHAUSTED', 'the next person gets INVITE_EXHAUSTED');

-- A pending grant makes a pending member with a request for the admin.
select lives_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000004', 'alpha', 'hash-pend-aaaaaaaaaaaa')$$, 'a pending-grant code works');
reset role;
select is((select status from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000004'), 'pending', 'the member is pending');
select is((select verification_level from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000004'), 1::smallint, 'a pending grant gives level 1');
select is((select count(*) from public.verification_requests where membership_id = (select id from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000004') and status = 'pending'), 1::bigint, 'the admin has a request to decide');

-- Suspended, rejected, left.
update public.memberships set status = 'suspended', status_reason = 'test' where user_id = 'aaaaaaaa-1000-4000-8000-000000000007';
set local role service_role;
select throws_ok($$select * from public.redeem_invite('aaaaaaaa-1000-4000-8000-000000000007', 'alpha', 'hash-good-aaaaaaaaaaaa')$$, 'P0001', 'FORBIDDEN', 'a suspended member cannot come back with a code');
reset role;
update public.memberships set status = 'left', verification_level = 1 where user_id = 'cccccccc-1000-4000-8000-000000000001';
set local role service_role;
select lives_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000001', 'alpha', 'hash-good-aaaaaaaaaaaa')$$, 'someone who left can join again');
reset role;
select is((select count(*) from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000001'), 1::bigint, 'joining again reuses the old membership row');
select is((select status from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000001'), 'active', 'and it is active again');

-- Settings and college status.
update public.college_settings set allowed_methods = array['manual'] where college_id = 'aaaaaaaa-0000-4000-8000-000000000001';
set local role service_role;
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000005', 'alpha', 'hash-good-aaaaaaaaaaaa')$$, 'P0001', 'INVITE_INVALID', 'a college that does not take codes answers like a wrong code');
reset role;
update public.college_settings set allowed_methods = array['email_domain', 'invite_code', 'manual'] where college_id = 'aaaaaaaa-0000-4000-8000-000000000001';
update public.colleges set status = 'suspended' where slug = 'alpha';
set local role service_role;
select throws_ok($$select * from public.redeem_invite('cccccccc-1000-4000-8000-000000000005', 'alpha', 'hash-good-aaaaaaaaaaaa')$$, 'P0001', 'TENANT_SUSPENDED', 'a suspended college takes no new members');
reset role;
update public.colleges set status = 'active' where slug = 'alpha';

-- ===== submit_manual_join ====================================================
set local role service_role;
select lives_ok($$select * from public.submit_manual_join('cccccccc-1000-4000-8000-000000000005', 'alpha', 'enroll-hash-aaaaaaaaaaaa', '1234', 'B.Tech CSE', 2028, 'req-m')$$, 'a manual request works');
reset role;
select is((select status || ':' || verification_level from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000005'), 'pending:1', 'manual makes a pending member at level 1');
select is((select enrollment_last4 from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000005'), '1234', 'only the last 4 characters are kept in the clear');
select is((select enrollment_hash from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000005'), 'enroll-hash-aaaaaaaaaaaa', 'the hash is stored');
select is((select count(*) from public.verification_requests where method = 'manual' and submitted_data ->> 'enrollment_last4' = '1234'), 1::bigint, 'the admin has a manual request to decide');
select is((select count(*) from public.audit_logs where action = 'member.join_requested' and request_id = 'req-m'), 1::bigint, 'the manual request wrote an audit row');
select ok(not exists (select 1 from public.audit_logs where metadata::text like '%enroll-hash%'), 'the audit row holds no enrolment hash');

set local role service_role;
select throws_ok($$select * from public.submit_manual_join('cccccccc-1000-4000-8000-000000000006', 'alpha', 'enroll-hash-aaaaaaaaaaaa', '1234', 'B.Tech ECE', 2027)$$, 'P0001', 'CONFLICT', 'one enrolment number cannot be used by two people');
select throws_ok($$select * from public.submit_manual_join('cccccccc-1000-4000-8000-000000000005', 'alpha', 'enroll-hash-bbbbbbbbbbbb', '5678', 'B.Tech CSE', 2028)$$, 'P0001', 'CONFLICT', 'a pending member cannot send a second request');
select lives_ok($$select * from public.submit_manual_join('cccccccc-1000-4000-8000-000000000006', 'beta', 'enroll-hash-aaaaaaaaaaaa', '1234', 'B.Tech ECE', 2027)$$, 'the same hash in another college is fine');
reset role;
update public.college_settings set allowed_methods = array['invite_code'] where college_id = 'bbbbbbbb-0000-4000-8000-000000000001';
set local role service_role;
select throws_ok($$select * from public.submit_manual_join('cccccccc-1000-4000-8000-000000000007', 'beta', 'enroll-hash-cccccccccccc', '9999', 'B.Tech', 2027)$$, 'P0001', 'FORBIDDEN', 'a college without the manual method refuses it');
reset role;

-- ===== email domain ==========================================================
set local role service_role;
select is(public.email_domain_allowed('alpha', 'alpha.test'), true, 'alpha.test is a registered domain of Alpha');
select is(public.email_domain_allowed('alpha', 'ALPHA.TEST'), true, 'domain check ignores case');
select is(public.email_domain_allowed('alpha', 'gmail.com'), false, 'gmail.com is not a college domain');
select is(public.email_domain_allowed('alpha', 'beta.test'), false, 'another college domain does not count');
select is(public.email_domain_allowed('beta', 'beta.test'), false, 'Beta has switched email_domain off in this test');
reset role;

set local role service_role;
select lives_ok($$select * from public.complete_email_domain_join('cccccccc-1000-4000-8000-000000000007', 'alpha', 'alpha.test', 'req-d')$$, 'college email join works');
reset role;
select is((select status || ':' || verification_level || ':' || verification_method from public.memberships where user_id = 'cccccccc-1000-4000-8000-000000000007'), 'active:2:email_domain', 'college email makes an active member at level 2');
select is((select count(*) from public.audit_logs where action = 'member.joined' and request_id = 'req-d'), 1::bigint, 'the college email join wrote an audit row');

set local role service_role;
select throws_ok($$select * from public.complete_email_domain_join('cccccccc-1000-4000-8000-000000000008', 'alpha', 'gmail.com')$$, 'P0001', 'DOMAIN_NOT_ALLOWED', 'another domain is DOMAIN_NOT_ALLOWED');
reset role;
update public.college_domains set verified_at = null where domain = 'alpha.test';
set local role service_role;
select throws_ok($$select * from public.complete_email_domain_join('cccccccc-1000-4000-8000-000000000008', 'alpha', 'alpha.test')$$, 'P0001', 'DOMAIN_NOT_ALLOWED', 'an unverified domain does not count');
reset role;

-- ===== pending members cannot use member endpoints ===========================
select pg_temp.act_as('cccccccc-1000-4000-8000-000000000004');
select is((select status from public.my_membership_for_slug('alpha')), 'pending', 'a pending member sees pending');
select is((select count(*) from public.auth_member_colleges()), 0::bigint, 'a pending member is in no college for the RLS helpers');
select is((select count(*) from public.profiles where user_id::text like 'aaaaaaaa%'), 0::bigint, 'a pending member sees no Alpha profiles');
reset role;

-- ===== the public view =======================================================
update public.colleges set status = 'draft' where slug = 'beta';
set local role anon;
select is((select array_agg(slug order by slug) from public.public_college_branding), array['alpha', 'global'], 'anon sees active colleges only (Alpha, and the Global space)');
select throws_ok($$select * from public.colleges$$, '42501', null, 'anon still cannot read the colleges table');
select throws_ok($$select college_id from public.public_college_branding$$, '42703', null, 'the view does not expose internal columns');
reset role;

select * from finish();
rollback;
