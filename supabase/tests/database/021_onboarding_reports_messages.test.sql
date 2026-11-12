-- Migrations 20261121 to 20261124: private profile details, reports for everything, feedback, disappearing messages, photo paths.
-- Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, students ...0003 to ...0005. Beta admin bbbbbbbb-1000-...-0001.
-- Alpha is aaaaaaaa-0000-4000-8000-000000000001, Beta bbbbbbbb-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- ===== clients cannot touch any of it ========================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.profile_private$$, '42501', null, 'a client cannot read private profile details');
select throws_ok($$select * from public.dm_messages$$, '42501', null, 'a client cannot read messages');
select throws_ok($$select * from public.dm_threads$$, '42501', null, 'a client cannot read threads');
select throws_ok($$select * from public.feedback$$, '42501', null, 'a client cannot read feedback');
select throws_ok($$select public.profile_private_get('aaaaaaaa-1000-4000-8000-000000000003')$$, '42501', null, 'a client cannot call profile_private_get');
select throws_ok($$select public.dm_purge()$$, '42501', null, 'a client cannot call dm_purge');
reset role;

-- ===== private details =======================================================
select throws_ok($$select public.profile_private_set('aaaaaaaa-1000-4000-8000-000000000003', '{"sex": "robot"}'::jsonb)$$, '23514', null, 'an unknown sex answer is refused');
select throws_ok($$select public.profile_private_set('aaaaaaaa-1000-4000-8000-000000000003', '{"phone": "98765"}'::jsonb)$$, '23514', null, 'a number that is not in the +91... form is refused');
select is((public.profile_private_set('aaaaaaaa-1000-4000-8000-000000000003', '{"sex": "prefer_not_to_say", "birth_year": 2006}'::jsonb) ->> 'sex'), 'prefer_not_to_say', 'prefer not to say is an answer');
select is((public.profile_private_get('aaaaaaaa-1000-4000-8000-000000000003') ->> 'birth_year')::int, 2006, 'the birth year is kept');
select is((public.profile_private_get('aaaaaaaa-1000-4000-8000-000000000003') ->> 'phone_visibility'), 'hidden', 'the number is hidden by default');
select is((public.profile_private_get('aaaaaaaa-1000-4000-8000-000000000004') ->> 'sex'), null, 'someone who never answered has no sex on record');

-- ===== the host sees a number that was shared with hosts =====================
insert into t select 'plan', (public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'sport', 'Late football', 'Five a side.', now() + interval '1 day', null, null, '[{"role_name":"Player","slots":4,"skill_ids":[]}]') ->> 'id');
select public.tf_set_join_mode('aaaaaaaa-1000-4000-8000-000000000003', (select v::uuid from t where k = 'plan'), 'open');
select public.tf_join_open('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'), null);
select public.profile_private_set('aaaaaaaa-1000-4000-8000-000000000004', '{"phone": "+919876543210"}'::jsonb);
select is((select p ->> 'phone' from jsonb_array_elements(public.tf_participants('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'))) p where (p ->> 'user_id') = 'aaaaaaaa-1000-4000-8000-000000000004'), null, 'a hidden number is not shown to the host');
select public.profile_private_set('aaaaaaaa-1000-4000-8000-000000000004', '{"phone_visibility": "hosts"}'::jsonb);
select is((select p ->> 'phone' from jsonb_array_elements(public.tf_participants('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'))) p where (p ->> 'user_id') = 'aaaaaaaa-1000-4000-8000-000000000004'), '+919876543210', 'a number shared with hosts is shown to the host');
select is((select p ->> 'phone' from jsonb_array_elements(public.tf_participants('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'))) p where (p ->> 'user_id') = 'aaaaaaaa-1000-4000-8000-000000000004'), null, 'but not to the person themselves in the list, nor to other joiners');
select public.profile_private_set('aaaaaaaa-1000-4000-8000-000000000004', '{"phone": null}'::jsonb);
select is((select p ->> 'phone' from jsonb_array_elements(public.tf_participants('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'plan'))) p where (p ->> 'user_id') = 'aaaaaaaa-1000-4000-8000-000000000004'), null, 'clearing the number removes it');

-- ===== disappearing messages =================================================
select throws_ok($$select public.dm_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003', 'to myself')$$, 'P0001', 'NOT_FOUND', 'nobody messages themselves');
select throws_ok($$select public.dm_send('bbbbbbbb-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000004', 'hello')$$, 'P0001', 'FORBIDDEN', 'someone of another college cannot message into Alpha');
select throws_ok($$select public.dm_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000004', '')$$, '23514', null, 'an empty message is refused');
select lives_ok($$select public.dm_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000004', 'Coming for football tonight?')$$, 'a classmate can send a message');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000004' and type = 'dm.received'), 1, 'the other person is told');
select lives_ok($$select public.dm_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000004', 'And bring water')$$, 'a second message is fine');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000004' and type = 'dm.received'), 1, 'but it does not ring again');
select is((select unread from public.dm_inbox('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001') where other_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 2, 'two messages are waiting');
select is((select unread from public.dm_inbox('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001') where other_id = 'aaaaaaaa-1000-4000-8000-000000000004'), 0, 'the sender has nothing unread');
select is(jsonb_array_length(public.dm_thread('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003') -> 'messages'), 2, 'opening the conversation shows both');
select is((select count(*)::int from public.dm_messages where sender_id = 'aaaaaaaa-1000-4000-8000-000000000003' and opened_at is not null and expires_at <= now() + interval '61 minutes'), 2, 'opened messages now expire within the hour');
select is((select unread from public.dm_inbox('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001') where other_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 0, 'and they are not unread any more');
-- Reporting copies the recent messages into the report
select is((public.dm_report('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003', 'harassment', null) ->> 'status'), 'open', 'a conversation can be reported');
select ok((select details like '%Messages:%football%' from public.reports where reporter_id = 'aaaaaaaa-1000-4000-8000-000000000004' and target_id = 'aaaaaaaa-1000-4000-8000-000000000003' and target_type = 'profile'), 'the report carries a copy of the messages');
select throws_ok($$select public.dm_report('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003', 'spam', null)$$, 'P0001', 'CONFLICT', 'a second open report about the same person is refused');
-- Expired messages are deleted
update public.dm_messages set expires_at = now() - interval '1 minute' where sender_id = 'aaaaaaaa-1000-4000-8000-000000000003';
select is(jsonb_array_length(public.dm_thread('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003') -> 'messages'), 0, 'an expired message is already hidden');
select ok(public.dm_purge() >= 2, 'the hourly job deletes them for good');
select is((select count(*)::int from public.dm_inbox('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001')), 0, 'and the conversation leaves the inbox');

-- ===== reports for a buzz, and the moderator hides it ========================
insert into t select 'idea', (public.idea_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', '', 'Buy cheap followers here', 'other') ->> 'id');
select throws_ok(format($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'idea', %L, 'spam', null)$$, (select v from t where k = 'idea')), 'P0001', 'VALIDATION_FAILED', 'nobody reports their own buzz');
insert into t select 'report', (public.create_report('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'idea', (select v::uuid from t where k = 'idea'), 'spam', null) ->> 'id');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'idea', gen_random_uuid(), 'spam', null)$$, 'P0001', 'NOT_FOUND', 'a buzz that does not exist cannot be reported');
select is((public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'report'), 'hide', 'This is spam', null) -> 'report' ->> 'status'), 'actioned', 'a moderator hides it from the queue');
select is((select status from public.ideas where id = (select v::uuid from t where k = 'idea')), 'removed', 'the buzz is removed');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and type = 'content.removed'), 1, 'the author is told with a reason, once');

-- ===== feedback ==============================================================
select lives_ok($$select public.feedback_create('aaaaaaaa-1000-4000-8000-000000000003', null, 'idea', 'Add dark mode toggles please', '/c/alpha/home')$$, 'feedback can be sent');
select lives_ok($$select public.feedback_create('aaaaaaaa-1000-4000-8000-000000000003', null, 'problem', 'The page was slow today', null) from generate_series(1, 9)$$, 'nine more are fine');
select throws_ok($$select public.feedback_create('aaaaaaaa-1000-4000-8000-000000000003', null, 'idea', 'One more than ten a day', null)$$, 'P0001', 'RATE_LIMITED', 'the eleventh in a day is refused');
select throws_ok($$select public.feedback_create('aaaaaaaa-1000-4000-8000-000000000004', null, 'idea', 'abc', null)$$, '23514', null, 'a note of a few letters is refused');
select ok((select count(*) from public.owner_feedback(null, 50)) >= 10, 'the owner sees the notes');

-- ===== photo paths ===========================================================
insert into t select 'post', (public.board_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'market', 'sell', 'Old guitar for sale', 'Good strings.', 'Hostel B', 1500) ->> 'id');
select throws_ok(format($$select public.board_set_photo('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'aaaaaaaa-1000-4000-8000-000000000004/x.webp')$$, (select v from t where k = 'post')), 'P0001', 'FORBIDDEN', 'only the author attaches a photo');
select throws_ok(format($$select public.board_set_photo('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'aaaaaaaa-1000-4000-8000-000000000004/x.webp')$$, (select v from t where k = 'post')), 'P0001', 'VALIDATION_FAILED', 'a path under someone else''s folder is refused');
select throws_ok(format($$select public.board_set_photo('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'aaaaaaaa-1000-4000-8000-000000000003/../x.webp')$$, (select v from t where k = 'post')), 'P0001', 'VALIDATION_FAILED', 'a path that climbs out of the folder is refused');
select is((public.board_set_photo('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'post'), 'aaaaaaaa-1000-4000-8000-000000000003/1.webp') ->> 'photo_path'), 'aaaaaaaa-1000-4000-8000-000000000003/1.webp', 'the author attaches a photo');
select is((public.board_set_photo('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'post'), null) ->> 'photo_path'), null, 'and removes it');

select * from finish();
rollback;
