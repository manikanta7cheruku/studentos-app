-- Seed data for local development and tests. ALL FAKE. No real people, no real emails, no passwords.
-- Emails end in .test (a reserved name that can never be a real address).
-- Sign-in is by email code, so no password is stored.
--
-- Two colleges: Alpha College and Beta Institute.
-- Per college: admin, moderator, 3 students, 1 pending user, 1 suspended user.
-- The two student1 users share one display name on purpose, to catch cross-college leaks.

-- ---------------------------------------------------------------------------
-- Colleges (college_settings rows are created by a trigger)
-- ---------------------------------------------------------------------------
insert into public.colleges (id, slug, name, short_name, city, state, status, accent_hex)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alpha', 'Alpha College', 'Alpha', 'Hyderabad', 'Telangana', 'active', '#1D4ED8'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'beta', 'Beta Institute', 'Beta', 'Pune', 'Maharashtra', 'active', '#047857');

insert into public.college_domains (college_id, domain, verified_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alpha.test', now()),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'beta.test', now());

-- Beta uses fewer join methods than Alpha, so tests can see that settings are per college.
update public.college_settings
set allowed_methods = array['invite_code', 'manual']
where college_id = 'bbbbbbbb-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Users (auth.users + auth.identities). Fixed ids so tests can name them.
-- Id pattern: <college prefix>-1000-4000-8000-00000000000<n>
--   1 admin, 2 moderator, 3 student1, 4 student2, 5 student3, 6 pending, 7 suspended
-- ---------------------------------------------------------------------------
create temporary table seed_users (
  id uuid,
  email text,
  display_name text,
  handle text
) on commit drop;

insert into seed_users (id, email, display_name, handle)
values
  ('aaaaaaaa-1000-4000-8000-000000000001', 'admin@alpha.test', 'Aarav Admin', 'aarav_alpha'),
  ('aaaaaaaa-1000-4000-8000-000000000002', 'moderator@alpha.test', 'Meera Moderator', 'meera_alpha'),
  ('aaaaaaaa-1000-4000-8000-000000000003', 'student1@alpha.test', 'Riya Sharma', 'riya_alpha'),
  ('aaaaaaaa-1000-4000-8000-000000000004', 'student2@alpha.test', 'Kabir Rao', 'kabir_alpha'),
  ('aaaaaaaa-1000-4000-8000-000000000005', 'student3@alpha.test', 'Ishaan Verma', 'ishaan_alpha'),
  ('aaaaaaaa-1000-4000-8000-000000000006', 'pending@alpha.test', 'Neha Pending', 'neha_alpha'),
  ('aaaaaaaa-1000-4000-8000-000000000007', 'suspended@alpha.test', 'Dev Suspended', 'dev_alpha'),
  ('bbbbbbbb-1000-4000-8000-000000000001', 'admin@beta.test', 'Zoya Admin', 'zoya_beta'),
  ('bbbbbbbb-1000-4000-8000-000000000002', 'moderator@beta.test', 'Arjun Moderator', 'arjun_beta'),
  ('bbbbbbbb-1000-4000-8000-000000000003', 'student1@beta.test', 'Riya Sharma', 'riya_beta'),
  ('bbbbbbbb-1000-4000-8000-000000000004', 'student2@beta.test', 'Tara Nair', 'tara_beta'),
  ('bbbbbbbb-1000-4000-8000-000000000005', 'student3@beta.test', 'Vikram Singh', 'vikram_beta'),
  ('bbbbbbbb-1000-4000-8000-000000000006', 'pending@beta.test', 'Sana Pending', 'sana_beta'),
  ('bbbbbbbb-1000-4000-8000-000000000007', 'suspended@beta.test', 'Rohan Suspended', 'rohan_beta');

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', ''
from seed_users u;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from seed_users u;

insert into public.profiles (user_id, display_name, handle, headline, interests, visibility)
select
  u.id, u.display_name, u.handle, 'Seed user for local testing', array['web', 'design'], 'college'
from seed_users u;

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------
insert into public.memberships (
  user_id, college_id, role, status, verification_level, verification_method,
  program, grad_year, joined_at, status_reason
)
select
  u.id,
  case when left(u.id::text, 8) = 'aaaaaaaa' then 'aaaaaaaa-0000-4000-8000-000000000001'::uuid
       else 'bbbbbbbb-0000-4000-8000-000000000001'::uuid end,
  case right(u.id::text, 1) when '1' then 'college_admin' when '2' then 'moderator' else 'student' end,
  case right(u.id::text, 1) when '6' then 'pending' when '7' then 'suspended' else 'active' end,
  case right(u.id::text, 1) when '5' then 1 when '6' then 1 else 2 end,
  case right(u.id::text, 1) when '1' then 'manual' when '2' then 'manual'
    when '3' then 'email_domain' when '4' then 'email_domain' when '5' then 'invite_code'
    else 'manual' end,
  'B.Tech CSE',
  2028,
  case right(u.id::text, 1) when '6' then null else now() end,
  case right(u.id::text, 1) when '7' then 'Seed: suspended for testing' else null end
from seed_users u;

-- ---------------------------------------------------------------------------
-- A few audit rows, written through the only allowed function
-- ---------------------------------------------------------------------------
select public.write_audit_log(
  'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001', 'college_admin',
  'college.seeded', 'college', 'aaaaaaaa-0000-4000-8000-000000000001', '{"source": "seed"}'::jsonb, 'seed-alpha-1'
);
select public.write_audit_log(
  'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-1000-4000-8000-000000000001', 'college_admin',
  'college.seeded', 'college', 'bbbbbbbb-0000-4000-8000-000000000001', '{"source": "seed"}'::jsonb, 'seed-beta-1'
);
