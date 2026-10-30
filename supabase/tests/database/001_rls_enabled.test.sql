-- R5/R2 gate: row level security must be on for every table, and tenant tables need policies.
-- Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Named checks, one per table, so a failure names the table.
select ok((select relrowsecurity from pg_class where oid = 'public.colleges'::regclass), 'RLS is on: colleges');
select ok((select relrowsecurity from pg_class where oid = 'public.college_domains'::regclass), 'RLS is on: college_domains');
select ok((select relrowsecurity from pg_class where oid = 'public.college_settings'::regclass), 'RLS is on: college_settings');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS is on: profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.memberships'::regclass), 'RLS is on: memberships');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass), 'RLS is on: audit_logs');

-- Catch-all: any table added later without RLS makes this fail.
select is(
  (select count(*)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0::bigint,
  'every table in schema public has RLS enabled'
);

-- Every table with a college_id column has at least one policy.
select is(
  (select count(*)
   from information_schema.columns col
   join information_schema.tables t
     on t.table_schema = col.table_schema and t.table_name = col.table_name and t.table_type = 'BASE TABLE'
   where col.table_schema = 'public'
     and col.column_name = 'college_id'
     and not exists (
       select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = col.table_name
     )),
  0::bigint,
  'every table with a college_id column has at least one policy'
);

-- Every table has at least one policy (profiles has no college_id but still must be guarded).
select is(
  (select count(*)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)),
  0::bigint,
  'every table in schema public has at least one policy'
);

-- anon (not signed in) has no privileges on any table in public.
select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  0::bigint,
  'anon has no table privileges in schema public'
);

-- Clients can never write memberships (role, status and level are server-only).
select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'memberships'
     and grantee = 'authenticated' and privilege_type <> 'SELECT'),
  0::bigint,
  'authenticated can only SELECT memberships'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'colleges'
     and grantee = 'authenticated' and privilege_type <> 'SELECT'),
  0::bigint,
  'authenticated can only SELECT colleges'
);

-- Helper functions must pin search_path (protects SECURITY DEFINER functions).
select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  0::bigint,
  'every SECURITY DEFINER function in public has a fixed search_path'
);

-- The helper functions exist with the agreed names.
select has_function('public', 'auth_member_colleges', array['integer'], 'auth_member_colleges(int) exists');
select has_function('public', 'is_college_admin', array['uuid'], 'is_college_admin(uuid) exists');
select has_function('public', 'is_moderator_or_admin', array['uuid'], 'is_moderator_or_admin(uuid) exists');

-- Anonymous callers cannot run the helpers either.
select is(
  has_function_privilege('anon', 'public.is_college_admin(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute is_college_admin'
);

-- Settings are created together with the college.
select is(
  (select count(*) from public.college_settings),
  (select count(*) from public.colleges),
  'every college has exactly one settings row'
);

select * from finish();
rollback;
