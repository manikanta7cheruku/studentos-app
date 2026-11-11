-- The functional round, migration 20261117000000: one tap join, who is in, official and invite only events, and
-- removing content with a reason. Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, students ...0003 to ...0005.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- ===== clients cannot call the new functions =================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select public.tf_participants('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid())$$, '42501', null, 'a client cannot call tf_participants');
select throws_ok($$select public.content_remove('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'event', gen_random_uuid(), 'spam', null)$$, '42501', null, 'a client cannot call content_remove');
select throws_ok($$select * from public.owner_content('', 10)$$, '42501', null, 'a client cannot call owner_content');
reset role;

-- ===== one tap join ==========================================================
insert into t select 'plan', (public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'sport', 'Turf football tonight', 'Five a side.', now() + interval '1 day', null, null, '[{"role_name":"Player","slots":2,"skill_ids":[]}]') ->> 'id');
select public.tf_set_join_mode('aaaaaaaa-1000-4000-8000-000000000003', (select v::uuid from t where k = 'plan'), 'open');
select throws_ok(format($$select public.tf_join_open('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, null)$$, (select v from t where k = 'plan')), 'P0001', 'FORBIDDEN', 'the host cannot join their own plan');
select lives_ok(format($$select public.tf_join_open('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, null)$$, (select v from t where k = 'plan')), 'a student joins with one call');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and type = 'team.joined'), 1, 'the host is told');
select throws_ok(format($$select public.tf_join_open('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, null)$$, (select v from t where k = 'plan')), 'P0001', 'ALREADY_REQUESTED', 'joining twice is refused');
select is(jsonb_array_length(public.tf_participants('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'))), 2, 'someone who joined sees the host and the joiner');
select is(jsonb_array_length(public.tf_participants('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'))), 0, 'someone outside sees nobody');

-- ===== events: official and personal, invite only ============================
select throws_ok($$select public.event_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'A student event', 'x', now() + interval '1 day', null, null)$$, 'P0001', 'FORBIDDEN', 'a student cannot create an event inside a college');
insert into t select 'ev', (public.event_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Official fest', 'x', now() + interval '2 days', null, null, true) ->> 'id');
select is((public.event_get('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev')) ->> 'kind'), 'official', 'an event of a college is official');
select is((select count(*)::int from public.event_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'upcoming', false, 50) l where l.id = (select v::uuid from t where k = 'ev')), 0, 'an invite only event is not in the list');
select is((public.event_get('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev')) ->> 'invite_only')::boolean, true, 'but it opens by its link');

-- ===== removing content with a reason ========================================
select throws_ok(format($$select public.content_remove('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'event', %L, 'spam', null)$$, (select v from t where k = 'ev')), 'P0001', 'FORBIDDEN', 'a student cannot remove content');
select throws_ok(format($$select public.content_remove('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'event', %L, 'spam', null)$$, (select v from t where k = 'ev')), 'P0001', 'NOT_FOUND', 'another college cannot reach it');
select lives_ok(format($$select public.content_remove('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'plan', %L, 'scam', 'Looks fake')$$, (select v from t where k = 'plan')), 'a moderator removes a plan');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and type = 'content.removed'), 1, 'the author is told');
select is((select count(*)::int from public.audit_logs where action = 'content.removed' and target_id = (select v from t where k = 'plan')), 1, 'and it is in the audit log');
select is((select count(*)::int from public.content_recent('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 100) c where c.id = (select v::uuid from t where k = 'plan')), 0, 'a removed plan leaves the moderator list');
select lives_ok(format($$select public.owner_content_remove('aaaaaaaa-1000-4000-8000-000000000001', 'event', %L, 'duplicate', null)$$, (select v from t where k = 'ev')), 'the owner removes an event of any college');
select is((select status from public.events where id = (select v::uuid from t where k = 'ev')), 'removed', 'it is marked removed');

select * from finish();
rollback;
