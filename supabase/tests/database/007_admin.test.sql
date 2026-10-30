-- College admin functions (ADM-03, 05 to 11): who may call them, what they do, and that every change writes ONE audit row.
-- Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, student1 ...0003, pending ...0006;
-- Beta admin bbbbbbbb-1000-...-0001. Colleges: Alpha aaaaaaaa-0000-...-0001, Beta bbbbbbbb-0000-...-0001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.alpha_audit() returns bigint language sql as
  $$ select count(*) from public.audit_logs where college_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$;

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ===== nobody but the server may call these =================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')$$, '42501', null, 'a signed-in admin cannot call admin_get_settings directly');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid(), 'student', null)$$, '42501', null, 'a signed-in admin cannot call admin_update_member directly');
reset role;
set local role anon;
select throws_ok($$select public.admin_stats(null, null)$$, '42501', null, 'anon cannot call admin_stats');
reset role;

-- ===== only an active admin of THIS college ================================
select throws_ok($$select public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'FORBIDDEN', 'a student is FORBIDDEN');
select throws_ok($$select public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'FORBIDDEN', 'a moderator is FORBIDDEN');
select throws_ok($$select public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'FORBIDDEN', 'a pending member is FORBIDDEN');
select throws_ok($$select public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'FORBIDDEN', 'a suspended member is FORBIDDEN');
select throws_ok($$select public.admin_get_settings('bbbbbbbb-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'FORBIDDEN', 'the admin of ANOTHER college is FORBIDDEN');
select throws_ok($$select public.admin_get_settings(null, 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'FORBIDDEN', 'no actor is FORBIDDEN');
select throws_ok($$select * from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, 10)$$, 'P0001', 'FORBIDDEN', 'a student cannot list members');
select throws_ok($$select * from public.admin_list_audit_logs('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, 10)$$, 'P0001', 'FORBIDDEN', 'a moderator cannot read the audit log');
select throws_ok($$select public.admin_create_invite('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-student-aaaaaaaa', 'x', 1, now() + interval '1 day', 'active')$$, 'P0001', 'FORBIDDEN', 'a student cannot create an invite');
select is(pg_temp.alpha_audit(), 1::bigint, 'refused calls write no audit row (only the seed row exists)');

-- ===== settings (ADM-03) ====================================================
select is((public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001') -> 'college' ->> 'name'), 'Alpha College', 'settings include the read only college block');
select is((public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001') -> 'college' -> 'domains' -> 0 ->> 'domain'), 'alpha.test', 'and the domains');

select lives_ok($$select public.admin_update_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '{"require_admin_approval": false, "min_level_to_post": 2}'::jsonb, 'req-set')$$, 'an admin can change settings');
select is(pg_temp.alpha_audit(), 2::bigint, 'the settings change wrote exactly one audit row');
select is((select metadata -> 'changed' from public.audit_logs where request_id = 'req-set'), '["min_level_to_post", "require_admin_approval"]'::jsonb, 'the audit row names the changed keys');
select is((select require_admin_approval from public.college_settings where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), false, 'the setting changed');
select is((select allowed_methods from public.college_settings where college_id = 'bbbbbbbb-0000-4000-8000-000000000001'), array['invite_code', 'manual'], 'Beta settings were not touched');
select throws_ok($$select public.admin_update_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '{"allowed_methods": ["sms"]}'::jsonb)$$, '23514', null, 'an unknown join method is refused');
select throws_ok($$select public.admin_update_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '{}'::jsonb)$$, 'P0001', 'VALIDATION_FAILED', 'an empty change is refused');
select is(pg_temp.alpha_audit(), 2::bigint, 'refused settings changes wrote no audit row');

-- ===== invites (ADM-05) =====================================================
select lives_ok($$select public.admin_create_invite('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-adm-aaaaaaaaaaaa', 'Batch 2028', 10, now() + interval '7 days', 'pending', 'req-inv')$$, 'an admin can create an invite');
select is(pg_temp.alpha_audit(), 3::bigint, 'creating an invite wrote exactly one audit row');
select is((select action from public.audit_logs where request_id = 'req-inv'), 'invite.created', 'it is invite.created');
select ok(not exists (select 1 from public.audit_logs where metadata::text like '%hash-adm%'), 'the audit row holds no code hash');
select is((public.admin_create_invite('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-adm-bbbbbbbbbbbb', 'Batch 2029', 3, now() + interval '1 day', 'active') ->> 'status'), 'active', 'a new invite has the status active');
select throws_ok($$select public.admin_create_invite('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-adm-cccccccccccc', 'Old', 3, now() - interval '1 day', 'active')$$, 'P0001', 'VALIDATION_FAILED', 'an invite that ends in the past is refused');
select throws_ok($$select public.admin_create_invite('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-adm-aaaaaaaaaaaa', 'Dup', 3, now() + interval '1 day', 'active')$$, '23505', null, 'the same code hash twice is refused');
select is((select count(*) from public.admin_list_invites('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')), 2::bigint, 'the list shows the two Alpha invites');
select is((select count(*) from public.admin_list_invites('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001')), 0::bigint, 'Beta sees none of them');

select is((public.admin_revoke_invite('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.invite_codes where code_hash = 'hash-adm-aaaaaaaaaaaa'), 'req-rev') ->> 'status'), 'revoked', 'revoking sets the status revoked');
select is((select action from public.audit_logs where request_id = 'req-rev'), 'invite.revoked', 'and writes invite.revoked');
select throws_ok($$select public.admin_revoke_invite('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.invite_codes where code_hash = 'hash-adm-aaaaaaaaaaaa'))$$, 'P0001', 'CONFLICT', 'revoking twice is CONFLICT');
select throws_ok($$select public.admin_revoke_invite('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', (select id from public.invite_codes where code_hash = 'hash-adm-bbbbbbbbbbbb'))$$, 'P0001', 'NOT_FOUND', 'a Beta admin cannot revoke an Alpha invite (NOT_FOUND)');
select is(pg_temp.alpha_audit(), 5::bigint, 'two creates and one revoke wrote exactly three audit rows in all');

-- ===== verification queue (ADM-06, ADM-07) ==================================
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', ('dddddddd-1000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated',
       'queue' || n || '@alpha.test', now(), now(), '', '', '', ''
from generate_series(1, 4) n;
select public.submit_manual_join(('dddddddd-1000-4000-8000-00000000000' || n)::uuid, 'alpha', 'queue-hash-' || n || '-aaaaaaaa', '000' || n, 'B.Tech CSE', 2028)
from generate_series(1, 4) n;
select is(pg_temp.alpha_audit(), 9::bigint, 'four manual joins wrote four audit rows');

select is((select count(*) from public.admin_list_verification_requests('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'pending', 10)), 4::bigint, 'the queue shows the 4 waiting people');
select is((select count(*) from public.admin_list_verification_requests('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'pending', 2)), 2::bigint, 'the page size is respected');
select is((select count(*) from public.admin_list_verification_requests('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', null, 10)), 0::bigint, 'Beta sees none of Alpha''s queue');

select is(
  (public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000001'),
     'approved', null, 'req-ok') -> 'membership' ->> 'status'),
  'active', 'approving makes the member active'
);
select is((select verification_level from public.memberships where user_id = 'dddddddd-1000-4000-8000-000000000001'), 2::smallint, 'at level 2');
select is((select r.status from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000001'), 'approved', 'and the request is approved');
select is(pg_temp.alpha_audit(), 10::bigint, 'the approval wrote exactly one audit row');
select is((select action from public.audit_logs where request_id = 'req-ok'), 'member.approved', 'it is member.approved');
select throws_ok(
  $$select public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000001'),
     'approved')$$, 'P0001', 'CONFLICT', 'deciding an item that is already decided is CONFLICT (stale screen)'
);
select throws_ok(
  $$select public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000002'),
     'rejected')$$, 'P0001', 'VALIDATION_FAILED', 'rejecting needs a reason'
);
select throws_ok(
  $$select public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000002'),
     'rejected', 'no')$$, 'P0001', 'VALIDATION_FAILED', 'a reason under 5 characters is refused'
);
select is(pg_temp.alpha_audit(), 10::bigint, 'refused decisions wrote no audit row');
select is(
  (public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000002'),
     'rejected', 'Enrollment number not found', 'req-no') -> 'membership' ->> 'status'),
  'rejected', 'rejecting with a reason marks the member rejected'
);
select is((select status_reason from public.memberships where user_id = 'dddddddd-1000-4000-8000-000000000002'), 'Enrollment number not found', 'and keeps the reason');
select is((select action from public.audit_logs where request_id = 'req-no'), 'member.rejected', 'it is member.rejected');
select is(pg_temp.alpha_audit(), 11::bigint, 'the rejection wrote exactly one audit row');

-- An admin cannot decide their own request.
insert into public.verification_requests (membership_id, college_id, method, status)
select m.id, m.college_id, 'manual', 'pending' from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000001';
select throws_ok(
  $$select public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000001'),
     'approved')$$, 'P0001', 'FORBIDDEN', 'an admin cannot approve their own request'
);
-- Another college's request.
select throws_ok(
  $$select public.admin_decide_verification('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
     (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'dddddddd-1000-4000-8000-000000000003'),
     'approved')$$, 'P0001', 'NOT_FOUND', 'a Beta admin cannot decide an Alpha request (NOT_FOUND)'
);

-- ===== members (ADM-08, ADM-09) =============================================
select ok((select count(*) from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, 50)) >= 11, 'the member list shows the Alpha memberships');
select is((select count(*) from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Riya', null, null, 50)), 1::bigint, 'search by name finds one Riya in Alpha (not the Beta lookalike)');
select is((select count(*) from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '%', null, null, 50)), 0::bigint, 'a % in the search is a plain character, not a wildcard');
select is((select count(*) from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'suspended', null, 50)), 1::bigint, 'the status filter works');
select is((select count(*) from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, 'moderator', 50)), 1::bigint, 'the role filter works');
select ok(not exists (select 1 from public.admin_list_members('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, 50) where member::text like '%@%'), 'the member list holds no email address');

select is((public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
  (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), null, 'suspended', 'Repeated spam reports', 'req-sus') ->> 'status'), 'suspended', 'an admin can suspend a member');
select is((select action from public.audit_logs where request_id = 'req-sus'), 'member.suspended', 'it writes member.suspended');
select is(pg_temp.alpha_audit(), 12::bigint, 'and exactly one audit row');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000005'), null, 'suspended')$$, 'P0001', 'VALIDATION_FAILED', 'suspending needs a reason');
select is((public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
  (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), null, 'active', null, 'req-re') ->> 'status'), 'active', 'an admin can reinstate a suspended member');
select is((select status_reason from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), null, 'and the reason is cleared');
select is((select action from public.audit_logs where request_id = 'req-re'), 'member.reinstated', 'it writes member.reinstated');
select is((public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
  (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000005'), null, 'left', 'Left the college', 'req-left') ->> 'status'), 'left', 'an admin can remove a member');
select is((select action from public.audit_logs where request_id = 'req-left'), 'member.removed', 'it writes member.removed');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000005'), null, 'active')$$, 'P0001', 'CONFLICT', 'a removed member cannot be set active again here');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), null, 'active')$$, 'P0001', 'CONFLICT', 'a pending member is approved through the queue, not here');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'bbbbbbbb-1000-4000-8000-000000000003'), 'moderator', null)$$, 'P0001', 'NOT_FOUND', 'a member of another college is NOT_FOUND');

-- Last admin: the only admin cannot be demoted, suspended or removed, not even by themselves.
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'), 'student', null)$$, 'P0001', 'LAST_ADMIN', 'the last admin cannot be demoted');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'), null, 'suspended', 'testing the rule')$$, 'P0001', 'LAST_ADMIN', 'the last admin cannot be suspended');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'), null, 'left', 'testing the rule')$$, 'P0001', 'LAST_ADMIN', 'the last admin cannot be removed');
select throws_ok($$delete from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'$$, '23514', 'a college must keep at least one active admin', 'and the database trigger still blocks it as a second lock');

-- Two admins: a role change works, but nobody changes their own role or status.
select is((public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
  (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000002'), 'college_admin', null, null, 'req-role') ->> 'role'), 'college_admin', 'an admin can make a moderator an admin');
select is((select action from public.audit_logs where request_id = 'req-role'), 'member.role_changed', 'it writes member.role_changed');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'), 'student', null)$$, 'P0001', 'FORBIDDEN', 'with two admins, an admin still cannot demote themselves');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000001'), null, 'suspended', 'testing the rule')$$, 'P0001', 'FORBIDDEN', 'or suspend themselves');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 'owner', null)$$, 'P0001', 'VALIDATION_FAILED', 'an unknown role is refused');
select throws_ok($$select public.admin_update_member('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), null, null)$$, 'P0001', 'VALIDATION_FAILED', 'an empty change is refused');

-- ===== audit log read (ADM-10) and stats (ADM-11) ===========================
select ok((select count(*) from public.admin_list_audit_logs('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, 100)) >= 10, 'the audit list shows the Alpha rows');
select is((select count(*) from public.admin_list_audit_logs('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'invite.created', null, 100)), 2::bigint, 'the action filter works');
select is((select count(*) from public.admin_list_audit_logs('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, 3)), 3::bigint, 'the page size is respected');
select ok((select bool_and(college_id is not null) from public.audit_logs where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'all listed rows belong to Alpha');
select ok(not exists (select 1 from public.admin_list_audit_logs('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', null, null, 100) l where l.action like 'invite.%'), 'Beta sees none of the Alpha invite rows');
select is((select actor_name from public.admin_list_audit_logs('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'settings.updated', null, 5) limit 1), 'Aarav Admin', 'the list shows the name of the actor');
select is(((public.admin_stats('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')) ->> 'pending_verifications')::int, 3, 'stats: the admin own request and the two waiting people (3 pending)');
select is(((public.admin_stats('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')) ->> 'active_invites')::int, 1, 'stats: one usable invite');

-- ===== a suspended college takes no admin work ===============================
update public.colleges set status = 'suspended' where slug = 'alpha';
select throws_ok($$select public.admin_get_settings('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')$$, 'P0001', 'TENANT_SUSPENDED', 'a suspended college answers TENANT_SUSPENDED');
update public.colleges set status = 'active' where slug = 'alpha';

select * from finish();
rollback;
