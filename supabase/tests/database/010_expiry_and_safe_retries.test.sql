-- Safe retries and expiry (migration 20261108000000). Users from supabase/seed.sql: Alpha admin ...0001,
-- moderator ...0002, student1 ...0003, student2 ...0004, student3 ...0005, pending ...0006, suspended ...0007.
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
create function pg_temp.notes(p_user uuid, p_type text) returns bigint language sql as
  $$ select count(*) from public.notifications where user_id = p_user and type = p_type $$;
create function pg_temp.mk_post(p_actor uuid, p_title text) returns uuid language sql as $$
  select (public.tf_create_post(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', 'hackathon', p_title, 'Building something.', now() + interval '5 days', null, null,
    '[{"role_name":"Backend developer","slots":2,"skill_ids":[]}]'::jsonb) ->> 'id')::uuid
$$;

-- ===== nobody but the server calls these ====================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select public.idem_claim('aaaaaaaa-1000-4000-8000-000000000001', 'key-12345678', 'r', 'h')$$, '42501', null, 'a signed-in admin cannot claim a key directly');
select throws_ok($$select public.maintenance_run()$$, '42501', null, 'nor run the maintenance');
reset role;
set local role anon;
select throws_ok($$select public.maintenance_run()$$, '42501', null, 'anon cannot either');
reset role;

-- ===== idempotency: claim, in progress, replay, mismatch, release, takeover =====
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST x', 'hash1') ->> 'outcome'), 'claimed', 'the first request claims the key');
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST x', 'hash1') ->> 'outcome'), 'in_progress', 'a second one at the same moment is told to wait');
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST x', 'other') ->> 'outcome'), 'mismatch', 'the same key with a different body is a mismatch');
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000004', 'key-aaaaaaaa', 'POST x', 'hash1') ->> 'outcome'), 'claimed', 'another person can use the same key text');
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST y', 'hash1') ->> 'outcome'), 'claimed', 'and the same person on another route');
select public.idem_complete('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST x', 201, '{"data":{"id":"abc"}}'::jsonb);
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST x', 'hash1')), '{"outcome":"replay","status_code":201,"response":{"data":{"id":"abc"}}}'::jsonb, 'after completion the saved answer comes back');
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-aaaaaaaa', 'POST x', 'other') ->> 'outcome'), 'mismatch', 'a different body is still a mismatch after completion');

select public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-bbbbbbbb', 'POST x', 'hash2');
select public.idem_release('aaaaaaaa-1000-4000-8000-000000000003', 'key-bbbbbbbb', 'POST x');
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-bbbbbbbb', 'POST x', 'hash2') ->> 'outcome'), 'claimed', 'a failed attempt releases the key so it can try again');
select public.idem_complete('aaaaaaaa-1000-4000-8000-000000000003', 'key-bbbbbbbb', 'POST x', 200, '{"ok":true}'::jsonb);
select public.idem_release('aaaaaaaa-1000-4000-8000-000000000003', 'key-bbbbbbbb', 'POST x');
select is((select count(*) from public.idempotency_keys where key = 'key-bbbbbbbb'), 1::bigint, 'release never deletes a finished answer');

select public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-cccccccc', 'POST x', 'hash3');
update public.idempotency_keys set locked_until = now() - interval '1 second' where key = 'key-cccccccc';
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-cccccccc', 'POST x', 'hash3') ->> 'outcome'), 'claimed', 'a claim of a crashed request is taken over after 60 seconds');

update public.idempotency_keys set expires_at = now() - interval '1 minute' where key = 'key-bbbbbbbb';
select is((public.idem_claim('aaaaaaaa-1000-4000-8000-000000000003', 'key-bbbbbbbb', 'POST x', 'new-body') ->> 'outcome'), 'claimed', 'a key older than 24 hours can be used again');

-- ===== maintenance: team posts past their deadline ===========================
insert into t select 'p1', pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000005', 'Hackathon team that will expire');
insert into t select 'p2', pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000005', 'Hackathon team still open');
insert into t select 'r1', (public.tf_create_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'),
  (select id from public.team_post_roles where post_id = (select v from t where k = 'p1')), 'pending one') ->> 'id')::uuid;
insert into t select 'r2', (public.tf_create_request('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'),
  (select id from public.team_post_roles where post_id = (select v from t where k = 'p1')), 'accepted one') ->> 'id')::uuid;
select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r2'), 'accepted', null);
insert into t select 'r3', (public.tf_create_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p2'),
  (select id from public.team_post_roles where post_id = (select v from t where k = 'p2')), 'on the other post') ->> 'id')::uuid;
update public.team_posts set deadline = now() - interval '1 hour' where id = (select v from t where k = 'p1');

select is((public.maintenance_run() ->> 'team_posts_expired'), '1', 'the maintenance expires exactly the post past its deadline');
select is((select status from public.team_posts where id = (select v from t where k = 'p1')), 'expired', 'it is marked expired');
select is((select status from public.team_posts where id = (select v from t where k = 'p2')), 'open', 'a post with a future deadline stays open');
select is((select status from public.join_requests where id = (select v from t where k = 'r1')), 'cancelled', 'its waiting request is cancelled');
select is((select status from public.join_requests where id = (select v from t where k = 'r2')), 'accepted', 'an accepted request stays accepted');
select is((select status from public.join_requests where id = (select v from t where k = 'r3')), 'pending', 'requests of other posts are untouched');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000003', 'team.request_cancelled'), 1::bigint, 'the waiting applicant was told');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000005', 'team.post_expired'), 1::bigint, 'the author was told');
select is((public.maintenance_run() ->> 'team_posts_expired'), '0', 'running it again does nothing (safe to repeat)');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000005', 'team.post_expired'), 1::bigint, 'and tells nobody twice');

-- ===== maintenance: join requests that waited more than 30 days ==============
insert into public.verification_requests (membership_id, college_id, method, status, created_at)
select m.id, m.college_id, 'manual', 'pending', now() - interval '31 days' from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000006';
select is((public.maintenance_run() ->> 'join_requests_expired'), '1', 'a join request nobody decided in 30 days expires');
select is((select r.status from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), 'expired', 'the request is expired');
select is((select status from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), 'left', 'the person is no longer waiting, so they can apply again');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000006', 'membership.expired'), 1::bigint, 'and was told');
insert into public.verification_requests (membership_id, college_id, method, status, created_at)
select m.id, m.college_id, 'manual', 'pending', now() - interval '5 days' from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000005';
select is((public.maintenance_run() ->> 'join_requests_expired'), '0', 'a recent request is left alone');

-- ===== maintenance: old rows =================================================
insert into public.idempotency_keys (user_id, key, route, request_hash, response, status_code, expires_at)
values ('aaaaaaaa-1000-4000-8000-000000000003', 'old-key-0001', 'POST z', 'h', '{}'::jsonb, 200, now() - interval '3 hours');
insert into public.notifications (user_id, college_id, type, payload, created_at)
values ('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'report.actioned', '{"title":"t","message":"m"}'::jsonb, now() - interval '100 days');
insert into public.rate_limit_events (bucket, key_hash, created_at) values ('test_bucket', repeat('a', 32), now() - interval '2 days');
select cmp_ok((public.maintenance_run() ->> 'idempotency_keys_deleted')::int, '>=', 1, 'expired idempotency keys are deleted');
select is((select count(*) from public.idempotency_keys where key = 'old-key-0001'), 0::bigint, 'the old one is gone');
select is((select count(*) from public.notifications where created_at < now() - interval '90 days'), 0::bigint, 'notifications older than 90 days are deleted');
select is((select count(*) from public.rate_limit_events where bucket = 'test_bucket'), 0::bigint, 'old rate limit events are deleted');
select is((select count(*) from public.idempotency_keys where key = 'key-aaaaaaaa'), 3::bigint, 'keys that are still valid are kept');

select * from finish();
rollback;
