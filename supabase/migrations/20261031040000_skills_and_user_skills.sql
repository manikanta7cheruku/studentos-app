-- Migration 0005: skills and user_skills
-- Task: R3-D3-1. Spec: docs/DATABASE.md section 2.2, docs/API_CONTRACT.md PRF-02, PRF-03.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  status text not null default 'approved' check (status in ('approved', 'pending')),
  created_at timestamptz not null default now()
);

create unique index if not exists skills_lower_name_idx on public.skills (lower(name));

create table if not exists public.user_skills (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://'),
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

alter table public.skills enable row level security;
alter table public.user_skills enable row level security;

-- skills catalog: any authenticated user can read approved skills
drop policy if exists skills_select on public.skills;
create policy skills_select on public.skills
  for select to authenticated
  using (status = 'approved');

-- user_skills: users read their own or visible peers' skills
drop policy if exists user_skills_select on public.user_skills;
create policy user_skills_select on public.user_skills
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.user_id = user_skills.user_id
        and p.visibility = 'college'
        and p.deleted_at is null
        and public.auth_shares_college_with(p.user_id)
    )
  );

drop policy if exists user_skills_insert on public.user_skills;
create policy user_skills_insert on public.user_skills
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_skills_update on public.user_skills;
create policy user_skills_update on public.user_skills
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_skills_delete on public.user_skills;
create policy user_skills_delete on public.user_skills
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.skills to authenticated;
grant select, insert, update, delete on public.user_skills to authenticated;

-- Seed catalog skills with fixed IDs matching test fixtures
insert into public.skills (id, name, category, status)
values
  ('88888888-8888-4888-8888-888888888888', 'TypeScript', 'Programming', 'approved'),
  ('88888888-8888-4888-8888-888888888889', 'React', 'Frontend', 'approved'),
  ('88888888-8888-4888-8888-888888888890', 'Next.js', 'Frontend', 'approved'),
  ('88888888-8888-4888-8888-888888888891', 'Python', 'Programming', 'approved'),
  ('88888888-8888-4888-8888-888888888892', 'PostgreSQL', 'Database', 'approved'),
  ('88888888-8888-4888-8888-888888888893', 'UI/UX Design', 'Design', 'approved')
on conflict do nothing;
