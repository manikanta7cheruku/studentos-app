-- Rate limit functions and my_membership_for_slug.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ===== rate_limit_consume ====================================================
select is(public.rate_limit_consume('t_req', 'key-aaaaaaaaaaaaaaaa', 3, 3600), 0, 'first event is allowed');
select is(public.rate_limit_consume('t_req', 'key-aaaaaaaaaaaaaaaa', 3, 3600), 0, 'second event is allowed');
select is(public.rate_limit_consume('t_req', 'key-aaaaaaaaaaaaaaaa', 3, 3600), 0, 'third event is allowed');
select ok(public.rate_limit_consume('t_req', 'key-aaaaaaaaaaaaaaaa', 3, 3600) between 1 and 3600, 'fourth event is refused with seconds to wait');
select is(
  (select count(*) from public.rate_limit_events where bucket = 't_req' and key_hash = 'key-aaaaaaaaaaaaaaaa'),
  3::bigint, 'a refused event is not counted'
);
select is(public.rate_limit_consume('t_req', 'key-bbbbbbbbbbbbbbbb', 3, 3600), 0, 'another key has its own count');
select is(public.rate_limit_consume('t_other', 'key-aaaaaaaaaaaaaaaa', 3, 3600), 0, 'another bucket has its own count');

-- Old events fall out of the window.
update public.rate_limit_events set created_at = now() - interval '2 hours'
where bucket = 't_req' and key_hash = 'key-aaaaaaaaaaaaaaaa';
select is(public.rate_limit_consume('t_req', 'key-aaaaaaaaaaaaaaaa', 3, 3600), 0, 'events older than the window are not counted');

select throws_ok($$select public.rate_limit_consume('t', 'key-aaaaaaaaaaaaaaaa', 0, 60)$$, '22023', null, 'limit must be positive');
select throws_ok($$select public.rate_limit_consume('t', 'short', 1, 60)$$, '23514', null, 'a short key hash is rejected');

-- ===== peek, record, clear, last ============================================
select is(public.rate_limit_peek('t_fail', 'key-cccccccccccccccc', 2, 900), 0, 'peek: nothing recorded yet');
select public.rate_limit_record('t_fail', 'key-cccccccccccccccc');
select public.rate_limit_record('t_fail', 'key-cccccccccccccccc');
select ok(public.rate_limit_peek('t_fail', 'key-cccccccccccccccc', 2, 900) > 0, 'peek: blocked after the limit is reached');
select is(
  (select count(*) from public.rate_limit_events where bucket = 't_fail'), 2::bigint,
  'peek does not count'
);
select ok(public.rate_limit_last('t_fail', 'key-cccccccccccccccc') is not null, 'last returns a time');
select public.rate_limit_clear('t_fail', 'key-cccccccccccccccc');
select is(public.rate_limit_peek('t_fail', 'key-cccccccccccccccc', 2, 900), 0, 'clear removes the failures');
select is(public.rate_limit_last('t_fail', 'key-cccccccccccccccc'), null, 'last is null after clear');

-- ===== who may call them =====================================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select public.rate_limit_consume('t', 'key-aaaaaaaaaaaaaaaa', 5, 60)$$, '42501', null, 'a signed-in admin cannot call the rate limit functions');
select throws_ok($$select * from public.rate_limit_events$$, '42501', null, 'a signed-in admin cannot read rate_limit_events');

-- ===== my_membership_for_slug ===============================================
select is(
  (select status from public.my_membership_for_slug('alpha')), 'active',
  'an active member gets their own membership'
);
select is((select count(*) from public.my_membership_for_slug('beta')), 0::bigint, 'an Alpha admin gets nothing for Beta');
select is((select count(*) from public.my_membership_for_slug('nope')), 0::bigint, 'an unknown slug gives nothing');

reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000006');
select is((select status from public.my_membership_for_slug('alpha')), 'pending', 'a pending user can see their pending status');

reset role;
set local role anon;
select throws_ok($$select * from public.my_membership_for_slug('alpha')$$, '42501', null, 'anon cannot call my_membership_for_slug');

select * from finish();
rollback;
