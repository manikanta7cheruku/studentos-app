-- Migration 20261141: phone and desktop alerts.
-- Users from supabase/seed.sql: students aaaaaaaa-1000-4000-8000-000000000003 to ...0005. Alpha is aaaaaaaa-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ===== clients cannot touch any of it ========================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.push_subscriptions$$, '42501', null, 'a client cannot read devices');
select throws_ok($$select public.push_claim(10)$$, '42501', null, 'a client cannot take alerts');
select throws_ok($$select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/a', 'k', 'a', 'x')$$, '42501', null, 'a client cannot save a device');
reset role;

-- ===== saving devices ========================================================
select lives_ok($$select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/one', 'key1', 'auth1', 'phone')$$, 'a device is saved');
select lives_ok($$select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/one', 'key2', 'auth2', 'phone')$$, 'the same device again is fine');
select is((select count(*)::int from public.push_subscriptions where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 1, 'and stored once');
select is((select p256dh from public.push_subscriptions where endpoint = 'https://push.example/one'), 'key2', 'with the newest keys');
select throws_ok($$select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'http://push.example/plain', 'k', 'a', 'x')$$, '23514', null, 'an address that is not https is refused');

select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/two', 'k', 'a', 'x');
select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/three', 'k', 'a', 'x');
select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/four', 'k', 'a', 'x');
select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/five', 'k', 'a', 'x');
select public.push_subscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/six', 'k', 'a', 'x');
select is((select count(*)::int from public.push_subscriptions where user_id = 'aaaaaaaa-1000-4000-8000-000000000003'), 5, 'a person keeps at most 5 devices');

-- ===== sending ===============================================================
-- Old notifications were marked as already pushed by the migration; make two fresh ones for person 3 and one for person 4 (no device).
insert into public.notifications (user_id, college_id, type, payload) values
  ('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'announcement.published', '{"title": "T1", "message": "M1"}'),
  ('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'announcement.published', '{"title": "T2", "message": "M2"}');
select is((select count(*)::int from public.notifications where pushed_at is null), 2, 'new notifications wait to be pushed');

select is((select count(*)::int from public.push_claim(50)), 5, 'person 3 has one notification and 5 devices: 5 rows; person 4 has no device: none');
select is((select count(*)::int from public.notifications where pushed_at is null), 0, 'both notifications are now taken');
select is((select count(*)::int from public.push_claim(50)), 0, 'a second run finds nothing: each is sent once');

-- Old ones are marked without being sent.
insert into public.notifications (user_id, college_id, type, payload, created_at)
values ('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'announcement.published', '{"title": "Old"}', now() - interval '3 hours');
select is((select count(*)::int from public.push_claim(50)), 0, 'an alert older than 2 hours is not sent');
select is((select count(*)::int from public.notifications where pushed_at is null), 0, 'but it is marked');

-- ===== removing ==============================================================
select is(public.push_unsubscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/six'), 1, 'a device is removed');
select is(public.push_unsubscribe('aaaaaaaa-1000-4000-8000-000000000003', 'https://push.example/six'), 0, 'removing it again changes nothing');
select is(public.push_unsubscribe('aaaaaaaa-1000-4000-8000-000000000004', 'https://push.example/five'), 0, 'one person cannot remove another person''s device');
select is(public.push_drop(array(select id from public.push_subscriptions where user_id = 'aaaaaaaa-1000-4000-8000-000000000003')), 4, 'devices the push service dropped are forgotten');

select * from finish();
rollback;
