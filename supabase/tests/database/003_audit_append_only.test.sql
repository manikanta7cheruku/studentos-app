-- The audit log is append only: nobody can change or remove a row, and only the server can add one.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Owner (the most powerful role we use) still cannot rewrite history.
select throws_ok(
  $$update public.audit_logs set action = 'tampered'$$,
  '42501', 'audit_logs is append-only', 'the owner cannot UPDATE audit_logs'
);
select throws_ok(
  $$delete from public.audit_logs$$,
  '42501', 'audit_logs is append-only', 'the owner cannot DELETE from audit_logs'
);
select throws_ok(
  $$truncate public.audit_logs$$,
  '42501', 'audit_logs is append-only', 'the owner cannot TRUNCATE audit_logs'
);

-- A signed-in admin cannot write directly.
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok(
  $$insert into public.audit_logs (college_id, actor_role, action) values ('aaaaaaaa-0000-4000-8000-000000000001', 'college_admin', 'forged')$$,
  '42501', null, 'an admin cannot INSERT into audit_logs directly'
);
select throws_ok($$update public.audit_logs set action = 'x'$$, '42501', null, 'an admin cannot UPDATE audit_logs');
select throws_ok($$delete from public.audit_logs$$, '42501', null, 'an admin cannot DELETE from audit_logs');
select throws_ok(
  $$select public.write_audit_log('aaaaaaaa-0000-4000-8000-000000000001', null, 'college_admin', 'forged')$$,
  '42501', null, 'a signed-in user cannot call write_audit_log'
);

-- The server (service role) cannot write directly either; it must use the function.
reset role;
set local role service_role;
select throws_ok(
  $$insert into public.audit_logs (college_id, actor_role, action) values ('aaaaaaaa-0000-4000-8000-000000000001', 'system', 'direct')$$,
  '42501', null, 'the service role cannot INSERT directly'
);
select throws_ok($$update public.audit_logs set action = 'x'$$, '42501', null, 'the service role cannot UPDATE');

-- The function works for the service role and stores what we gave it.
select lives_ok(
  $$select public.write_audit_log(
      'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001', 'college_admin',
      'member.approved', 'membership', 'abc', '{"reason": "test"}'::jsonb, 'req-1')$$,
  'the service role can call write_audit_log'
);
select is(
  (select metadata ->> 'reason' from public.audit_logs where request_id = 'req-1'),
  'test',
  'the audit row holds the metadata we sent'
);
select throws_ok(
  $$select public.write_audit_log(null, null, 'system', 'x', null, null, '[1]'::jsonb)$$,
  '23514', null, 'metadata must be a JSON object'
);

-- Even with triggers switched off for replication, history stays protected.
reset role;
set local session_replication_role = replica;
select throws_ok(
  $$update public.audit_logs set action = 'tampered'$$,
  '42501', 'audit_logs is append-only', 'the guard also holds in replica mode'
);

select * from finish();
rollback;
