-- Application tracker (APP-01 to APP-04): private to the person, version check, status events.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', ('dddddddd-2000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated',
       'tracker' || n || '@alpha.test', now(), now(), '', '', '', ''
from generate_series(1, 2) n;

-- Create: the first status is also the first event.
select is(
  (public.app_create('dddddddd-2000-4000-8000-000000000001',
    '{"company":"  Acme  ","role_title":"Frontend intern","status":"saved","deadline":"2027-01-15","source_url":"https://acme.example/jobs/1"}'::jsonb)
   ->> 'company'),
  'Acme',
  'create trims the company'
);
select is(
  (select count(*)::int from public.application_events where user_id = 'dddddddd-2000-4000-8000-000000000001' and from_status is null and to_status = 'saved'),
  1,
  'the first event has no from status'
);

-- Setting applied on create fills the applied date.
select isnt(
  (public.app_create('dddddddd-2000-4000-8000-000000000001', '{"company":"B","role_title":"R","status":"applied"}'::jsonb) ->> 'applied_on'),
  null,
  'applied fills the applied date'
);

-- The tables are closed to clients.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'dddddddd-2000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.job_applications$$, '42501', null, 'a signed in client cannot read the table');
select throws_ok($$select * from public.application_events$$, '42501', null, 'a signed in client cannot read the events');
reset role;

-- Update with the right version raises it, with an old one is refused.
create temp table t_app as
  select (public.app_create('dddddddd-2000-4000-8000-000000000001', '{"company":"Zeta","role_title":"Designer"}'::jsonb) ->> 'id')::uuid as id;
select is(
  (public.app_update('dddddddd-2000-4000-8000-000000000001', (select id from t_app), '{"notes":"hello"}'::jsonb, 1) ->> 'version')::int,
  2,
  'update with the current version raises it by 1'
);
select throws_ok(
  format($$select public.app_update('dddddddd-2000-4000-8000-000000000001', %L, '{"notes":"again"}'::jsonb, 1)$$, (select id from t_app)),
  'P0001', 'VERSION_CONFLICT', 'an old version is refused'
);
select is(
  (public.app_update('dddddddd-2000-4000-8000-000000000001', (select id from t_app), '{"deadline":null}'::jsonb, null) ->> 'deadline'),
  null,
  'null clears a date, and no version means no check'
);

-- Status change: event written, version raised, same status refused.
select is(
  (public.app_change_status('dddddddd-2000-4000-8000-000000000001', (select id from t_app), 'interview', 'Round 1', null) ->> 'status'),
  'interview',
  'the status changes'
);
select is(
  (select to_status || ' from ' || from_status from public.application_events
   where application_id = (select id from t_app) and to_status = 'interview'),
  'interview from saved',
  'the change left an event'
);
select throws_ok(
  format($$select public.app_change_status('dddddddd-2000-4000-8000-000000000001', %L, 'interview', null, null)$$, (select id from t_app)),
  'P0001', 'CONFLICT', 'the same status again is refused'
);

-- Another person cannot see, change or delete it.
select is(public.app_json((select id from t_app), 'dddddddd-2000-4000-8000-000000000002'), null, 'another person gets nothing');
select throws_ok(
  format($$select public.app_update('dddddddd-2000-4000-8000-000000000002', %L, '{"notes":"x"}'::jsonb, null)$$, (select id from t_app)),
  'P0001', 'NOT_FOUND', 'another person cannot change it'
);
select throws_ok(
  format($$select public.app_change_status('dddddddd-2000-4000-8000-000000000002', %L, 'offer', null, null)$$, (select id from t_app)),
  'P0001', 'NOT_FOUND', 'another person cannot change its status'
);

-- A link to an opportunity the person cannot see is refused.
select throws_ok(
  $$select public.app_create('dddddddd-2000-4000-8000-000000000001', '{"company":"C","role_title":"R","opportunity_id":"99999999-9999-4999-8999-999999999999"}'::jsonb)$$,
  'P0001', 'NOT_FOUND', 'an unknown opportunity is not found'
);

-- The table rules.
select throws_ok(
  $$insert into public.job_applications (user_id, company, role_title, source_url) values ('dddddddd-2000-4000-8000-000000000001', 'X', 'Y', 'http://not-https.example')$$,
  '23514', null, 'a link must be https'
);
select throws_ok(
  $$insert into public.job_applications (user_id, company, role_title, status) values ('dddddddd-2000-4000-8000-000000000001', 'X', 'Y', 'dreaming')$$,
  '23514', null, 'the status must be one of the list'
);

-- Limit: 200 per person.
insert into public.job_applications (user_id, company, role_title)
select 'dddddddd-2000-4000-8000-000000000002', 'Company ' || n, 'Role' from generate_series(1, 200) n;
select throws_ok(
  $$select public.app_create('dddddddd-2000-4000-8000-000000000002', '{"company":"One too many","role_title":"R"}'::jsonb)$$,
  'P0001', 'RATE_LIMITED', 'the 201st application is refused'
);

-- Deleting an application deletes its events; deleting the user deletes everything.
delete from public.job_applications where id = (select id from t_app);
select is((select count(*)::int from public.application_events where application_id = (select id from t_app)), 0, 'events go with the application');
delete from auth.users where id = 'dddddddd-2000-4000-8000-000000000001';
select is((select count(*)::int from public.job_applications where user_id = 'dddddddd-2000-4000-8000-000000000001'), 0, 'deleting the account deletes the applications');

select * from finish();
rollback;
