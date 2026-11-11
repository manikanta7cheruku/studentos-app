-- Turf and court booking, migration 20261118000000: venues, booking requests, the manager's answer, overlaps and notes.
-- Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, students ...0003 to ...0005. Beta admin bbbbbbbb-1000-...-0001.
-- Alpha is aaaaaaaa-0000-4000-8000-000000000001, Beta bbbbbbbb-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- ===== clients cannot call the functions or read the tables =================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.venues$$, '42501', null, 'a client cannot read venues');
select throws_ok($$select * from public.venue_bookings$$, '42501', null, 'a client cannot read bookings');
select throws_ok($$select * from public.venue_list('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, 10)$$, '42501', null, 'a client cannot call venue_list');
select throws_ok($$select public.booking_cancel('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid())$$, '42501', null, 'a client cannot call booking_cancel');
reset role;

-- ===== adding a venue ========================================================
select throws_ok($$select public.venue_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Student turf', 'x', array['football'], null, 500, 6::smallint, 23::smallint)$$, 'P0001', 'FORBIDDEN', 'a student cannot add a venue inside a college');
select throws_ok($$select public.venue_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Backwards hours', 'x', array['football'], null, 500, 20::smallint, 8::smallint)$$, '23514', null, 'a venue that closes before it opens is refused');
select throws_ok($$select public.venue_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'No sports', 'x', array[]::text[], null, 500, 6::smallint, 23::smallint)$$, '23514', null, 'a venue with no sport is refused');
insert into t select 'venue', (public.venue_create('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '  Greenfield Turf  ', 'Five a side, floodlights.', array['football', 'cricket'], 'Near gate 2', 800, 6::smallint, 23::smallint) ->> 'id');
select is((public.venue_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'name'), 'Greenfield Turf', 'the name is trimmed');
select is((public.venue_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'is_manager')::boolean, false, 'a student is not its manager');
select is((public.venue_get('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'is_manager')::boolean, true, 'the admin who added it is');
select is((public.venue_get('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'is_manager')::boolean, true, 'and so is a moderator of the college');
select is((select count(*)::int from public.venue_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 50) l where l.id = (select v::uuid from t where k = 'venue')), 1, 'a member sees it in the list');
select is((select count(*)::int from public.venue_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'cricket', 50) l where l.id = (select v::uuid from t where k = 'venue')), 1, 'the sport filter finds it');
select is((select count(*)::int from public.venue_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'tennis', 50) l where l.id = (select v::uuid from t where k = 'venue')), 0, 'and leaves it out for another sport');
select throws_ok(format($$select public.venue_get('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'venue')), 'P0001', 'NOT_FOUND', 'Beta cannot see an Alpha venue');

-- ===== the hours of a day ====================================================
select is(jsonb_array_length(public.venue_slots('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 1)), 17, 'one entry for every hour from 6 to 22');
select throws_ok(format($$select public.venue_slots('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, current_date + 400)$$, (select v from t where k = 'venue')), 'P0001', 'VALIDATION_FAILED', 'a day far away is refused');

-- ===== asking for a booking ==================================================
select throws_ok(format($$select public.booking_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, current_date + 1, 5::smallint, 1::smallint, null, '')$$, (select v from t where k = 'venue')), 'P0001', 'VALIDATION_FAILED', 'before it opens is refused');
select throws_ok(format($$select public.booking_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, current_date + 1, 22::smallint, 2::smallint, null, '')$$, (select v from t where k = 'venue')), 'P0001', 'VALIDATION_FAILED', 'past closing time is refused');
select throws_ok(format($$select public.booking_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, current_date + 1, 10::smallint, 5::smallint, null, '')$$, (select v from t where k = 'venue')), 'P0001', 'VALIDATION_FAILED', 'more than four hours is refused');
insert into t select 'b1', (public.booking_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 1, 10::smallint, 2::smallint, 10::smallint, 'Five a side tonight') ->> 'id');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000001' and type = 'venue.booking_requested'), 1, 'the manager is told');
select throws_ok(format($$select public.booking_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, current_date + 1, 11::smallint, 1::smallint, null, '')$$, (select v from t where k = 'venue')), 'P0001', 'ALREADY_REQUESTED', 'asking again for overlapping hours is refused');
select is((public.venue_slots('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 1) -> 4 ->> 'mine')::boolean, true, 'my own waiting request shows on the hours');
select is((public.venue_get('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'pending_count')::int, 1, 'the manager sees one waiting request');
select is((public.venue_get('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'pending_count')::int, 0, 'a student does not see the count');
select is((select count(*)::int from public.booking_list_mine('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 10)), 1, 'I see my own request');
select throws_ok(format($$select * from public.booking_list_venue('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, null, 10)$$, (select v from t where k = 'venue')), 'P0001', 'FORBIDDEN', 'a student cannot read the requests of a venue');
select is((select count(*)::int from public.booking_list_venue('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), 'pending', 10)), 1, 'a moderator reads the waiting requests');

-- ===== the manager answers ===================================================
select throws_ok(format($$select public.booking_decide('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'confirmed', null)$$, (select v from t where k = 'b1')), 'P0001', 'FORBIDDEN', 'a student cannot answer a request');
select throws_ok(format($$select public.booking_decide('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'maybe', null)$$, (select v from t where k = 'b1')), 'P0001', 'VALIDATION_FAILED', 'an answer other than confirmed or declined is refused');
select is((public.booking_decide('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'b1'), 'confirmed', 'See you at gate 2') ->> 'status'), 'confirmed', 'the manager confirms');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and type = 'venue.booking_confirmed'), 1, 'the student is told');
select throws_ok(format($$select public.booking_decide('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 'declined', null)$$, (select v from t where k = 'b1')), 'P0001', 'CONFLICT', 'an answered request cannot be answered again');
select is((public.venue_slots('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 1) -> 4 ->> 'state'), 'booked', 'the hours show as booked for everyone');
select throws_ok(format($$select public.booking_request('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, current_date + 1, 11::smallint, 1::smallint, null, '')$$, (select v from t where k = 'venue')), 'P0001', 'SLOTS_FULL', 'a request on confirmed hours answers SLOTS_FULL');
insert into t select 'b2', (public.booking_request('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 1, 12::smallint, 1::smallint, null, '') ->> 'id');
select is((public.booking_decide('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'b2'), 'declined', 'Booked for a match') ->> 'status'), 'declined', 'a moderator can decline too');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000004' and type = 'venue.booking_declined'), 1, 'and the student is told');

-- ===== cancelling ============================================================
select throws_ok(format($$select public.booking_cancel('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'b1')), 'P0001', 'NOT_FOUND', 'nobody cancels another person''s request');
select is((public.booking_cancel('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'b1')) ->> 'status'), 'cancelled', 'I cancel my confirmed booking');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000001' and type = 'venue.booking_cancelled'), 1, 'the manager is told');
select throws_ok(format($$select public.booking_cancel('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'b1')), 'P0001', 'CONFLICT', 'a cancelled request cannot be cancelled again');
select is((public.venue_slots('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 1) -> 4 ->> 'state'), 'free', 'the hours are free again');

-- ===== hiding a venue ========================================================
insert into t select 'b3', (public.booking_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue'), current_date + 2, 9::smallint, 1::smallint, null, '') ->> 'id');
select throws_ok(format($$select public.venue_hide('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'venue')), 'P0001', 'FORBIDDEN', 'a student cannot hide a venue');
select is((public.venue_hide('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'venue')) ->> 'status'), 'hidden', 'the manager hides it');
select is((select status from public.venue_bookings where id = (select v::uuid from t where k = 'b3')), 'declined', 'its waiting requests are declined');
select is((select count(*)::int from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000005' and type = 'venue.booking_declined'), 1, 'and those people are told');
select throws_ok(format($$select public.venue_get('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'venue')), 'P0001', 'NOT_FOUND', 'a hidden venue is not found');

select * from finish();
rollback;
