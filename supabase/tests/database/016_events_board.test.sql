-- Events (EVT-01 to EVT-05) and the board (BRD-01 to BRD-07), migration 20261115000000.
-- Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, student1 ...0003, student2 ...0004, student3 ...0005.
-- Beta: admin bbbbbbbb-1000-...-0001. Alpha is aaaaaaaa-0000-4000-8000-000000000001, Beta bbbbbbbb-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- ===== clients cannot touch anything =========================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.events$$, '42501', null, 'a client cannot read events');
select throws_ok($$select * from public.event_rsvps$$, '42501', null, 'a client cannot read rsvps');
select throws_ok($$select * from public.board_posts$$, '42501', null, 'a client cannot read board posts');
select throws_ok($$select * from public.board_messages$$, '42501', null, 'a client cannot read messages');
select throws_ok($$select public.event_list('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'upcoming', false, 10)$$, '42501', null, 'a client cannot call the event functions');
reset role;

-- ===== events ================================================================
insert into t select 'ev', (public.event_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '  Open mic night  ', 'Bring a song.', now() + interval '2 days', 'Main hall', 2) ->> 'id');
select is((public.event_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev')) ->> 'title'), 'Open mic night', 'the title is trimmed');
select is((public.event_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev')) ->> 'going_count')::int, 1, 'the author goes by default');
select throws_ok($$select public.event_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'In the past', 'x', now() - interval '1 day', null, null)$$, 'P0001', 'VALIDATION_FAILED', 'an event in the past is refused');
select throws_ok($$select public.event_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Too far away', 'x', now() + interval '2 years', null, null)$$, 'P0001', 'VALIDATION_FAILED', 'an event more than a year away is refused');
select throws_ok($$select public.event_create('bbbbbbbb-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Not my college', 'x', now() + interval '1 day', null, null)$$, 'P0001', 'FORBIDDEN', 'a person of another college cannot create one in Alpha');
select throws_ok(format($$select public.event_get('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'ev')), 'P0001', 'NOT_FOUND', 'Beta cannot see an Alpha event');

select is((select count(*)::int from public.event_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'upcoming', false, 50) l where l.id = (select v::uuid from t where k = 'ev')), 1, 'a member sees it as upcoming');
select is((select count(*)::int from public.event_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'upcoming', true, 50) l where l.id = (select v::uuid from t where k = 'ev')), 0, 'mine=true leaves out events I am not going to');
select is((select count(*)::int from public.event_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'past', false, 50) l where l.id = (select v::uuid from t where k = 'ev')), 0, 'and it is not in the past list');

select is((public.event_rsvp('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev'), true) ->> 'going_count')::int, 2, 'I say I am going');
select is((public.event_rsvp('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev'), true) ->> 'going_count')::int, 2, 'saying it twice changes nothing');
select throws_ok(format($$select public.event_rsvp('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', %L, true)$$, (select v from t where k = 'ev')), 'P0001', 'SLOTS_FULL', 'a full event answers SLOTS_FULL');
select is((public.event_rsvp('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev'), false) ->> 'going_count')::int, 1, 'I can say I am not going');
select throws_ok(format($$select public.event_cancel('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'ev')), 'P0001', 'FORBIDDEN', 'another student cannot cancel it');
select is((public.event_cancel('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'ev')) ->> 'status'), 'cancelled', 'a moderator cancels it');
select is((select count(*)::int from public.audit_logs where action = 'event.cancelled' and target_id = (select v from t where k = 'ev')), 1, 'and it is in the audit log');
select throws_ok(format($$select public.event_rsvp('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, true)$$, (select v from t where k = 'ev')), 'P0001', 'CONFLICT', 'nobody can go to a cancelled event');

-- ===== board: lost and found =================================================
insert into t select 'lf', (public.board_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'lostfound', 'lost', 'Black water bottle near the library', 'Red sticker.', 'Library', null) ->> 'id');
select is((public.board_get('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'lf')) ->> 'kind'), 'lost', 'a member reads the post');
select throws_ok($$select public.board_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'lostfound', 'sell', 'A wrong kind here', 'x', null, null)$$, '23514', null, 'a market kind on the lost and found board is refused');
select throws_ok($$select public.board_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'lostfound', 'lost', 'A price on a lost thing', 'x', null, 100)$$, '23514', null, 'lost and found has no price');
select throws_ok($$select public.board_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'market', 'free', 'A free thing with a price', 'x', null, 100)$$, '23514', null, 'a free item has no price');
select throws_ok(format($$select public.board_get('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'lf')), 'P0001', 'NOT_FOUND', 'Beta cannot see an Alpha post');

-- ===== board: marketplace and listing ========================================
insert into t select 'mk', (public.board_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'market', 'sell', 'Engineering Maths, 2nd year', 'Good condition.', 'Hostel B', 350) ->> 'id');
select is((public.board_get('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk')) ->> 'price_inr')::int, 350, 'the price is saved in rupees');
select is((select count(*)::int from public.board_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'market', null, 'open', false, 20) l where l.id = (select v::uuid from t where k = 'mk')), 1, 'it is on the market list');
select is((select count(*)::int from public.board_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'lostfound', null, 'open', false, 20) l where l.id = (select v::uuid from t where k = 'mk')), 0, 'and not on the lost and found list');
select is((select count(*)::int from public.board_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'market', 'rent', 'open', false, 20) l where l.id = (select v::uuid from t where k = 'mk')), 0, 'a kind filter leaves it out');

-- ===== private messages ======================================================
insert into t select 'm1', (public.board_message_send('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'), null, 'Is this still available?') ->> 'id');
insert into t select 'm2', (public.board_message_send('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'), null, 'Can I see it tomorrow?') ->> 'id');
select is(jsonb_array_length(public.board_messages_list('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'))), 2, 'the author sees both threads');
select is(jsonb_array_length(public.board_messages_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'))), 1, 'a buyer sees only their own thread');
select is(jsonb_array_length(public.board_messages_list('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'))), 0, 'someone else sees none');
select lives_ok(format($$select public.board_message_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'aaaaaaaa-1000-4000-8000-000000000004', 'Yes, come by tonight.')$$, (select v from t where k = 'mk')), 'the author answers someone who wrote');
select throws_ok(format($$select public.board_message_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'aaaaaaaa-1000-4000-8000-000000000002', 'Unprompted')$$, (select v from t where k = 'mk')), 'P0001', 'VALIDATION_FAILED', 'the author cannot start a thread with someone who never wrote');
select throws_ok(format($$select public.board_message_send('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, null, 'To whom?')$$, (select v from t where k = 'mk')), 'P0001', 'VALIDATION_FAILED', 'the author must say who the answer is for');
select is(jsonb_array_length(public.board_messages_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'))), 2, 'the buyer sees the answer in their thread');
select is(jsonb_array_length(public.board_messages_list('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'))), 1, 'and the other buyer does not');

-- ===== status and removal ====================================================
select throws_ok(format($$select public.board_set_status('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'resolved')$$, (select v from t where k = 'mk')), 'P0001', 'NOT_FOUND', 'only the author can close it');
select is((public.board_set_status('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'mk'), 'resolved') ->> 'status'), 'resolved', 'the author marks it sold');
select throws_ok(format($$select public.board_message_send('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, null, 'Too late')$$, (select v from t where k = 'mk')), 'P0001', 'CONFLICT', 'a resolved post takes no messages');
select is((select count(*)::int from public.board_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'market', null, 'open', false, 20) l where l.id = (select v::uuid from t where k = 'mk')), 0, 'it leaves the open list');
select throws_ok(format($$select public.board_remove('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'lf')), 'P0001', 'FORBIDDEN', 'another student cannot remove a post');
select lives_ok(format($$select public.board_remove('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'lf')), 'a moderator removes it');
select throws_ok(format($$select public.board_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'lf')), 'P0001', 'NOT_FOUND', 'a removed post is not found, even for its author');
select is((select count(*)::int from public.audit_logs where action = 'board.removed' and target_id = (select v from t where k = 'lf')), 1, 'a removal by a moderator is audit logged');

select * from finish();
rollback;
