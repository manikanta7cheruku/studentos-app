-- Global college and the open join method (TEN-09).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', ('dddddddd-1000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated',
       'open' || n || '@alpha.test', now(), now(), '', '', '', ''
from generate_series(1, 3) n;

-- The Global college exists, is active, and allows only "open".
select is((select status from public.colleges where slug = 'global'), 'active', 'Global is active');
select is(
  (select s.allowed_methods from public.college_settings s join public.colleges c on c.id = s.college_id where c.slug = 'global'),
  array['open'],
  'Global allows only the open method'
);

-- Joining makes an active level 1 member with the method "open".
select results_eq(
  $$select status, verification_level::int, verification_method
    from public.submit_open_join('dddddddd-1000-4000-8000-000000000001', 'global', 'req_pgtap')$$,
  $$values ('active'::text, 1, 'open'::text)$$,
  'a person joins Global at once, unverified'
);
select is(
  (select count(*)::int from public.audit_logs where actor_id = 'dddddddd-1000-4000-8000-000000000001' and action = 'member.joined'),
  1,
  'the join is audited'
);

-- A second join is a conflict.
select throws_ok(
  $$select * from public.submit_open_join('dddddddd-1000-4000-8000-000000000001', 'global', null)$$,
  'P0001', 'CONFLICT', 'a member cannot join twice'
);

-- A person who left can come back.
update public.memberships set status = 'left' where user_id = 'dddddddd-1000-4000-8000-000000000001';
select lives_ok(
  $$select * from public.submit_open_join('dddddddd-1000-4000-8000-000000000001', 'global', null)$$,
  'a person who left can join again'
);

-- Other colleges refuse the method.
select throws_ok(
  $$select * from public.submit_open_join('dddddddd-1000-4000-8000-000000000002', 'alpha', null)$$,
  'P0001', 'FORBIDDEN', 'Alpha does not allow the open method'
);
select throws_ok(
  $$select * from public.submit_open_join('dddddddd-1000-4000-8000-000000000002', 'no-such-college', null)$$,
  'P0001', 'NOT_FOUND', 'an unknown college is not found'
);

-- Only the Global college may switch the method on.
select throws_ok(
  $$update public.college_settings set allowed_methods = array['invite_code', 'open']
    where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '23514', null, 'Alpha cannot allow the open method'
);

select * from finish();
rollback;
