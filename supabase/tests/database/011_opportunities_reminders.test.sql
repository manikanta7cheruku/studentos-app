-- Opportunities, saved opportunities, reminders (migration 20261109000000). Users from supabase/seed.sql:
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
create function pg_temp.mk(p_actor uuid, p_title text, p_kind text default 'internship', p_extra jsonb default '{}'::jsonb) returns uuid language sql as $$
  select (public.mod_create_opportunity(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001',
    jsonb_build_object('title', p_title, 'org', 'Acme Labs', 'kind', p_kind, 'apply_url', 'https://acme.example.org/jobs/1') || p_extra) ->> 'id')::uuid
$$;
create function pg_temp.listed(p_actor uuid, p_opp uuid) returns boolean language sql as
  $$ select exists (select 1 from public.opp_list(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, null, null, false, 50) l where l.id = p_opp) $$;
create function pg_temp.cnt(p_actor uuid, p_kinds text[] default null, p_skills text[] default null, p_mode text default null,
  p_loc text default null, p_deadline text default null, p_q text default null, p_saved boolean default false) returns bigint language sql as
  $$ select count(*) from public.opp_list(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', p_kinds, p_skills, p_mode, p_loc, p_deadline, p_q, p_saved, 50) $$;
create function pg_temp.audit(p_action text) returns bigint language sql as
  $$ select count(*) from public.audit_logs where action = p_action $$;

-- ===== clients cannot touch anything =========================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select public.mod_create_opportunity('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '{}'::jsonb)$$, '42501', null, 'a signed-in admin cannot call the server functions directly');
select throws_ok($$select * from public.opportunities$$, '42501', null, 'nor read the table');
select throws_ok($$select * from public.saved_opportunities$$, '42501', null, 'nor the saved ones');
select throws_ok($$select * from public.reminders$$, '42501', null, 'nor the reminders');
select throws_ok($$select * from public.user_prefs$$, '42501', null, 'nor the preferences');
reset role;
set local role anon;
select throws_ok($$select * from public.opportunities$$, '42501', null, 'anon cannot read opportunities');
reset role;

-- ===== OPP-03 create ==========================================================
insert into t select 'o1', pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000002', 'Backend internship at Acme', 'internship',
  jsonb_build_object('location', 'Hyderabad', 'mode', 'hybrid', 'stipend_min', 1500000, 'stipend_max', 2500000,
    'skills', '["TypeScript","PostgreSQL"]'::jsonb, 'deadline', (now() + interval '10 days')::text, 'eligibility', 'Final year'));
select is(pg_temp.audit('opportunity.created'), 1::bigint, 'a moderator creates an opportunity and one audit row is written');
select is((select status from public.opportunities where id = (select v from t where k = 'o1')), 'published', 'it is published');
select is((select posted_by from public.opportunities where id = (select v from t where k = 'o1')), 'aaaaaaaa-1000-4000-8000-000000000002'::uuid, 'the poster is the moderator');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000003', 'Student posting')$$, 'P0001', 'FORBIDDEN', 'a student cannot create');
select throws_ok($$select pg_temp.mk('bbbbbbbb-1000-4000-8000-000000000001', 'Other college admin')$$, 'P0001', 'FORBIDDEN', 'nor the admin of another college');
select is(pg_temp.audit('opportunity.created'), 1::bigint, 'refused calls wrote no audit row');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Wrong kind', 'party')$$, '23514', null, 'an unknown kind is refused');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'ab')$$, '23514', null, 'a title shorter than 3 is refused');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Bad stipend', 'job', '{"stipend_min":500,"stipend_max":100}'::jsonb)$$, '23514', null, 'a stipend maximum below the minimum is refused');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Plain http link', 'job', '{"apply_url":"http://insecure.example.org"}'::jsonb)$$, '23514', null, 'a link that is not https is refused');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Too many skills', 'job', '{"skills":["a","b","c","d","e","f","g","h","i","j","k"]}'::jsonb)$$, '23514', null, 'more than 10 skills is refused');
select throws_ok($$select pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Bad mode', 'job', '{"mode":"moon"}'::jsonb)$$, '23514', null, 'an unknown mode is refused');
select is(pg_temp.audit('opportunity.created'), 1::bigint, 'refused values wrote no audit row either');

-- ===== OPP-01 list and filters ===============================================
insert into t select 'o2', pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Hackathon of the year', 'hackathon',
  jsonb_build_object('location', 'Bengaluru', 'mode', 'onsite', 'skills', '["React"]'::jsonb, 'deadline', (now() + interval '3 days')::text));
insert into t select 'o3', pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Draft scholarship', 'scholarship', '{"status":"draft"}'::jsonb);
insert into t select 'o4', pg_temp.mk('aaaaaaaa-1000-4000-8000-000000000001', 'Job without a deadline', 'job', '{"mode":"remote"}'::jsonb);
update public.opportunities set created_at = now() - interval '3 minutes' where id = (select v from t where k = 'o1');
update public.opportunities set created_at = now() - interval '2 minutes' where id = (select v from t where k = 'o2');
update public.opportunities set created_at = now() - interval '1 minute' where id = (select v from t where k = 'o4');
select ok(pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o1')), 'a member sees the published opportunity');
select ok(not pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o3')), 'a draft is not shown to members');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', array['hackathon']), 1::bigint, 'the kind filter works');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', array['hackathon', 'job']), 2::bigint, 'with several kinds');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, array['typescript']), 1::bigint, 'the skill filter ignores case');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, 'remote'), 1::bigint, 'the mode filter works');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, 'hyder'), 1::bigint, 'the location filter matches part of a word');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, '7d'), 1::bigint, 'closing within 7 days');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, '30d'), 2::bigint, 'closing within 30 days');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, null, 'acme'), 3::bigint, 'search by organisation');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, null, '%'), 0::bigint, 'a % in the search is a plain character');
select throws_ok($$select pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, 'tomorrow')$$, 'P0001', 'VALIDATION_FAILED', 'an unknown deadline filter is refused');
select is((select id from public.opp_list('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, null, null, false, 50) order by created_at desc, id desc limit 1), (select v from t where k = 'o4'), 'newest first');
select is((select count(*) from public.opp_list('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, null, null, false, 50,
  (select created_at from public.opportunities where id = (select v from t where k = 'o4')), (select v from t where k = 'o4'))), 2::bigint, 'the cursor skips what was already shown');
select throws_ok($$select pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000006')$$, 'P0001', 'FORBIDDEN', 'a pending member cannot list');
select throws_ok($$select pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000007')$$, 'P0001', 'FORBIDDEN', 'nor a suspended one');
select throws_ok($$select pg_temp.cnt('bbbbbbbb-1000-4000-8000-000000000003')$$, 'P0001', 'FORBIDDEN', 'nor a member of another college');
select is((select count(*) from public.opp_list('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, null, null, false, 50)), 3::bigint, 'moderators see the same published list through this call');
select is((select count(*) from public.mod_list_opportunities('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', null, 50)), 4::bigint, 'and the management list has the draft too');
select throws_ok($$select * from public.mod_list_opportunities('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, 50)$$, 'P0001', 'FORBIDDEN', 'a student cannot open the management list');

-- ===== OPP-02 detail ==========================================================
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1')) ->> 'title'), 'Backend internship at Acme', 'a member opens one');
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1')) ->> 'posted_by'), 'Meera Moderator', 'with who posted it');
select throws_ok($$select public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o3'))$$, 'P0001', 'NOT_FOUND', 'a draft is NOT_FOUND for members');
select throws_ok($$select public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid())$$, 'P0001', 'NOT_FOUND', 'an unknown id is NOT_FOUND');

-- ===== OPP-04 save and unsave ================================================
select is((public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o1'), true) ->> 'saved'), 'true', 'a member saves an opportunity');
select is((public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o1'), true) ->> 'saved'), 'true', 'saving twice is fine');
select is((select count(*) from public.saved_opportunities where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 1::bigint, 'and keeps one row');
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1')) ->> 'saved'), 'true', 'the detail says it is saved');
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1')) ->> 'saved'), 'false', 'but not for another person');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, null, null, true), 1::bigint, 'saved=true lists only my saved ones');
select throws_ok($$select public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o3'), true)$$, 'P0001', 'NOT_FOUND', 'a draft cannot be saved');
select throws_ok($$select public.opp_set_saved('bbbbbbbb-1000-4000-8000-000000000003', (select v from t where k = 'o1'), true)$$, 'P0001', 'NOT_FOUND', 'a member of another college sees no such opportunity');
select throws_ok($$select public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000006', (select v from t where k = 'o1'), true)$$, 'P0001', 'NOT_FOUND', 'nor does a pending member');
select is((public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'o1'), false) ->> 'saved'), 'false', 'removing something never saved is fine');

-- ===== OPP-03 edit, verify, remove ===========================================
-- now() is frozen inside one test transaction, so the saved time is moved on purpose.
update public.saved_opportunities set saved_at = now() + interval '1 minute';
update public.opportunities set last_verified_at = now() - interval '30 days' where id = (select v from t where k = 'o1');
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1')) ->> 'changed_since_saved'), 'false', 'no changed badge before an edit');
update public.saved_opportunities set saved_at = now() - interval '1 hour';
select is((public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1'), '{"title":"Backend internship (updated)","stipend_max":3000000}'::jsonb, 'req-up1') ->> 'title'), 'Backend internship (updated)', 'a moderator edits it');
select is(pg_temp.audit('opportunity.updated'), 1::bigint, 'with one audit row');
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1')) ->> 'changed_since_saved'), 'true', 'the person who saved it sees the changed badge');
select ok((select last_verified_at < now() - interval '29 days' from public.opportunities where id = (select v from t where k = 'o1')), 'an edit alone does not move the verified date');
select public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1'), '{"verified":true}'::jsonb);
select ok((select last_verified_at > now() - interval '1 minute' from public.opportunities where id = (select v from t where k = 'o1')), 'verified=true moves the verified date to now');
select throws_ok($$select public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1'), '{"title":"Hijack"}'::jsonb)$$, 'P0001', 'FORBIDDEN', 'a student cannot edit');
select throws_ok($$select public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o1'), '{}'::jsonb)$$, 'P0001', 'VALIDATION_FAILED', 'an empty edit is refused');
select throws_ok($$select public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid(), '{"title":"Nothing here"}'::jsonb)$$, 'P0001', 'NOT_FOUND', 'an unknown id is NOT_FOUND');
select is((public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o3'), '{"status":"published"}'::jsonb) ->> 'status'), 'published', 'a draft is published by changing its status');
select ok(pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o3')), 'and then members see it');

select is((public.mod_remove_opportunity('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o3'), 'req-rm1') ->> 'status'), 'removed', 'an admin removes one');
select is(pg_temp.audit('opportunity.removed'), 1::bigint, 'with one audit row');
select ok(not pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o3')), 'it leaves the list');
select throws_ok($$select public.mod_remove_opportunity('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o3'))$$, 'P0001', 'CONFLICT', 'removing twice is CONFLICT');
select throws_ok($$select public.mod_update_opportunity('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o3'), '{"title":"Zombie"}'::jsonb)$$, 'P0001', 'CONFLICT', 'a removed one cannot be edited');

-- ===== the Career tab switched off ===========================================
update public.college_settings set features = jsonb_set(features, '{career}', 'false') where college_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003')$$, 'P0001', 'FEATURE_DISABLED', 'a college with the Career tab off answers FEATURE_DISABLED');
select throws_ok($$select public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o1'), true)$$, 'P0001', 'FEATURE_DISABLED', 'for saving too');
update public.college_settings set features = jsonb_set(features, '{career}', 'true') where college_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select lives_ok($$select pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003')$$, 'and works again when switched on');

-- ===== reminders =============================================================
select is(public.rem_get('aaaaaaaa-1000-4000-8000-000000000003'), true, 'reminders are on by default');
select is(public.rem_set('aaaaaaaa-1000-4000-8000-000000000004', false), false, 'a person switches them off');
select is(public.rem_get('aaaaaaaa-1000-4000-8000-000000000004'), false, 'and it is remembered');
select throws_ok($$select public.rem_set(null, true)$$, 'P0001', 'VALIDATION_FAILED', 'no person, no setting');
update public.opportunities set deadline = now() + interval '20 hours' where id = (select v from t where k = 'o2');
select public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'o2'), true);
select public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'o2'), true);
select public.opp_set_saved('aaaaaaaa-1000-4000-8000-000000000005', (select v from t where k = 'o4'), true);
select is(public.reminders_run(), 1::int, 'one reminder: saved, closing within 48 hours, reminders on');
select is((select count(*) from public.notifications where type = 'opportunity.deadline_soon' and user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 1::bigint, 'the person got the notification');
select is((select payload ->> 'opportunity_id' from public.notifications where type = 'opportunity.deadline_soon' and user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), (select v::text from t where k = 'o2'), 'with a link to the opportunity');
select is((select count(*) from public.notifications where type = 'opportunity.deadline_soon' and user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), 0::bigint, 'a person who opted out got nothing');
select is((select count(*) from public.notifications where type = 'opportunity.deadline_soon' and user_id = 'aaaaaaaa-1000-4000-8000-000000000005'), 0::bigint, 'and no deadline means no reminder');
select is(public.reminders_run(), 0::int, 'running again sends nothing (once per deadline)');
select is((public.maintenance_run() ->> 'reminders_sent'), '0', 'the maintenance run reports the count');
update public.opportunities set deadline = now() - interval '1 hour' where id = (select v from t where k = 'o4');
select is((public.maintenance_run() ->> 'opportunities_expired'), '1', 'the maintenance marks a listing past its deadline as expired');
select is((select status from public.opportunities where id = (select v from t where k = 'o4')), 'expired', 'it is expired in the table');
select is((public.opp_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'o4')) ->> 'status'), 'expired', 'and members still see it, marked expired');
select is(pg_temp.cnt('aaaaaaaa-1000-4000-8000-000000000003', null, null, null, null, 'hide_closed'), 2::bigint, 'hide_closed leaves it out');

select * from finish();
rollback;
