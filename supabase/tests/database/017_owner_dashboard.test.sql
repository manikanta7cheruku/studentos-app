-- The owner (platform admin) dashboard, migration 20261116000000.
-- Users from supabase/seed.sql: Alpha admin ...0001, student1 ...0003. Alpha is aaaaaaaa-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- ===== clients cannot touch anything =========================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.platform_admins$$, '42501', null, 'a signed in client cannot read the owner list');
select throws_ok($$select public.owner_overview()$$, '42501', null, 'a signed in client cannot call the owner functions');
select throws_ok($$select * from public.owner_colleges()$$, '42501', null, 'nor read the colleges through them');
select throws_ok($$select * from public.owner_users('a', 10)$$, '42501', null, 'nor search users');
reset role;
set local role anon;
select throws_ok($$select public.owner_overview()$$, '42501', null, 'nobody signed in cannot call them either');
reset role;

-- ===== the owner list ========================================================
select throws_ok($$insert into public.platform_admins (user_id, pin_hash) values ('aaaaaaaa-1000-4000-8000-000000000001', 'plain text pin')$$, '23514', null, 'a PIN can only be stored as a hash');
select lives_ok($$insert into public.platform_admins (user_id, pin_hash) values ('aaaaaaaa-1000-4000-8000-000000000001', 'scrypt$16384$8$1$AAAA$AAAA')$$, 'an account can be put on the owner list with a hash');

-- ===== overview, sign-ups, colleges ==========================================
select cmp_ok((public.owner_overview() ->> 'colleges_total')::int, '>=', 2, 'the overview counts the colleges (Global is left out)');
select cmp_ok((public.owner_overview() ->> 'users_total')::int, '>=', 5, 'and the users');
select is((select count(*)::int from public.owner_signups(7)), 7, 'sign-ups come as one row per day');
select is((select count(*)::int from public.owner_signups(1000)), 180, 'and at most 180 days');
select cmp_ok((select jsonb_array_length(admins) from public.owner_colleges() where slug = 'alpha'), '>=', 1, 'a college lists its admins');
select is((select members > 0 from public.owner_colleges() where slug = 'alpha'), true, 'and its members');

-- ===== suspend and reactivate a college ======================================
select lives_ok($$select public.owner_college_set_status('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'suspended')$$, 'the owner suspends a college');
select is((select status from public.colleges where slug = 'alpha'), 'suspended', 'it is suspended');
select throws_ok($$select public.tf_assert_member('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', false)$$, 'P0001', 'TENANT_SUSPENDED', 'and its members are turned away');
select lives_ok($$select public.owner_college_set_status('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'active')$$, 'the owner reactivates it');
select is((select status from public.colleges where slug = 'alpha'), 'active', 'it is active again');
select throws_ok($$select public.owner_college_set_status('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'archived')$$, 'P0001', 'VALIDATION_FAILED', 'only active and suspended can be set');
select throws_ok($$select public.owner_college_set_status('aaaaaaaa-1000-4000-8000-000000000001', gen_random_uuid(), 'suspended')$$, 'P0001', 'NOT_FOUND', 'an unknown college is not found');
select is((select count(*)::int from public.audit_logs where actor_role = 'platform_owner' and action in ('owner.college_suspended', 'owner.college_reactivated')), 2, 'both changes are in the audit trail');

-- ===== setup codes ===========================================================
insert into t select 'code', public.owner_code_make('aaaaaaaa-1000-4000-8000-000000000001', 'Delta Institute', 14);
select is(char_length((select v from t where k = 'code')), 8, 'a made code has 8 digits');
select is((select state from public.owner_codes() where label = 'Delta Institute'), 'active', 'and is listed as active');
select is((select count(*)::int from public.audit_logs where action = 'owner.code_made' and metadata ->> 'label' = 'Delta Institute'), 1, 'making it is audit logged');
select is((select count(*)::int from public.audit_logs where metadata::text like '%' || (select v from t where k = 'code') || '%'), 0, 'the code itself is never written to the audit trail');
select lives_ok($$select public.owner_code_revoke('aaaaaaaa-1000-4000-8000-000000000001', (select id from public.owner_codes() where label = 'Delta Institute'))$$, 'the owner revokes it');
select is((select state from public.owner_codes() where label = 'Delta Institute'), 'expired', 'it shows as ended');
select throws_ok($$select public.owner_code_revoke('aaaaaaaa-1000-4000-8000-000000000001', (select id from public.owner_codes() where label = 'Delta Institute'))$$, 'P0001', 'NOT_FOUND', 'an ended code cannot be revoked again');
select throws_ok(format($$select public.college_setup_create('aaaaaaaa-1000-4000-8000-000000000003', encode(sha256(convert_to(%L, 'UTF8')), 'hex'), 'delta-inst', 'Delta Institute', 'D', 'Goa', 'GA', array[]::text[], array['manual'], true)$$, (select v from t where k = 'code')), 'P0001', 'FORBIDDEN', 'a revoked code no longer makes a college');

-- ===== users, reports, health, audit =========================================
select is((select count(*)::int from public.owner_users('student1', 10) where email like 'student1@alpha%'), 1, 'a user is found by email');
select is((select suspended from public.owner_users('student1@alpha', 10) limit 1), false, 'and is not suspended');
select cmp_ok((select jsonb_array_length(spaces) from public.owner_users('student1@alpha', 10) limit 1), '>=', 1, 'with the spaces they belong to');
select is((select count(*)::int from public.owner_users('%', 10)), 0, 'a percent sign in a search is not a wildcard');
select lives_ok($$select * from public.owner_reports(10)$$, 'the reports list works');
select cmp_ok((public.owner_health() ->> 'database_bytes')::bigint, '>', 0, 'health reports the database size');
select lives_ok($$select public.owner_user_audit('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003', 'owner.user_suspended')$$, 'an account change is written to the audit trail');
select cmp_ok((select count(*)::int from public.owner_audit(50)), '>=', 5, 'the audit list shows the owner actions');
select is((select count(*)::int from public.owner_audit(50) where action = 'unrelated.college.action'), 0, 'and only the owner actions');

select * from finish();
rollback;
