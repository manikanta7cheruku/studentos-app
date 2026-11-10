-- Application tracker (APP-01 to APP-04, R3 Day 7).
-- Spec: docs/DATABASE.md section 2.4 (job_applications, application_events), docs/FEATURES_AND_JOURNEYS.md F-13.
-- Private to the person: no college id, never shared, not even with admins. Same rules as the other tables: closed to
-- clients, the server calls functions with the service role, every function checks the owner again.
--
-- Rollback (by hand):
--   drop function public.app_change_status(uuid, uuid, text, text, integer);
--   drop function public.app_update(uuid, uuid, jsonb, integer);
--   drop function public.app_create(uuid, jsonb);
--   drop table public.application_events, public.job_applications;

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role_title text not null,
  source_url text,
  status text not null default 'saved',
  deadline date,
  applied_on date,
  notes text not null default '',
  opportunity_id uuid references public.opportunities (id) on delete set null,
  -- Raised by 1 on every change. A client that sends an old number is refused (VERSION_CONFLICT), so two devices
  -- cannot silently overwrite each other.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_applications_company_length check (char_length(company) between 1 and 120),
  constraint job_applications_role_length check (char_length(role_title) between 1 and 120),
  constraint job_applications_url_https check (
    source_url is null or (char_length(source_url) <= 500 and source_url ~ '^https://[^[:space:]]+$')
  ),
  constraint job_applications_status_valid check (
    status in ('saved', 'applied', 'assessment', 'interview', 'offer', 'rejected', 'withdrawn')
  ),
  constraint job_applications_notes_length check (char_length(notes) <= 4000)
);

create index job_applications_user_idx on public.job_applications (user_id, status, deadline);
create index job_applications_user_updated_idx on public.job_applications (user_id, updated_at desc, id desc);

create trigger job_applications_set_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text not null default '',
  at timestamptz not null default now(),
  constraint application_events_note_length check (char_length(note) <= 500)
);

create index application_events_app_idx on public.application_events (application_id, at desc);

alter table public.job_applications enable row level security;
alter table public.application_events enable row level security;
create policy job_applications_no_client_access on public.job_applications for select to authenticated using (false);
create policy application_events_no_client_access on public.application_events for select to authenticated using (false);
revoke all on public.job_applications from anon, authenticated;
revoke all on public.application_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- One application as JSON, with its events (newest first). Only for the owner.
-- ---------------------------------------------------------------------------
create function public.app_json(p_app uuid, p_actor uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'company', a.company,
    'role_title', a.role_title,
    'source_url', a.source_url,
    'status', a.status,
    'deadline', a.deadline,
    'applied_on', a.applied_on,
    'notes', a.notes,
    'opportunity_id', a.opportunity_id,
    'version', a.version,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'from_status', e.from_status, 'to_status', e.to_status, 'note', e.note, 'at', e.at
      ) order by e.at desc, e.id desc)
      from public.application_events e where e.application_id = a.id
    ), '[]'::jsonb)
  )
  from public.job_applications a
  where a.id = p_app and a.user_id = p_actor;
$$;

-- ---------------------------------------------------------------------------
-- APP-01 create. At most 200 applications per person (RATE_LIMITED).
-- A first event is written so the history starts with the first status.
-- ---------------------------------------------------------------------------
create function public.app_create(p_actor uuid, p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status text := coalesce(p_input ->> 'status', 'saved');
begin
  if p_actor is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if (select count(*) from public.job_applications where user_id = p_actor) >= 200 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  -- An opportunity may only be linked if it exists and the person has it saved or is a member of its college.
  if p_input ->> 'opportunity_id' is not null and not exists (
    select 1 from public.opportunities o
    join public.memberships m on m.college_id = o.college_id and m.user_id = p_actor and m.status = 'active'
    where o.id = (p_input ->> 'opportunity_id')::uuid and o.status in ('published', 'expired')
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.job_applications (
    user_id, company, role_title, source_url, status, deadline, applied_on, notes, opportunity_id
  )
  values (
    p_actor,
    btrim(p_input ->> 'company'),
    btrim(p_input ->> 'role_title'),
    nullif(btrim(coalesce(p_input ->> 'source_url', '')), ''),
    v_status,
    (p_input ->> 'deadline')::date,
    case when v_status = 'applied' then coalesce((p_input ->> 'applied_on')::date, current_date)
         else (p_input ->> 'applied_on')::date end,
    btrim(coalesce(p_input ->> 'notes', '')),
    (p_input ->> 'opportunity_id')::uuid
  )
  returning id into v_id;

  insert into public.application_events (application_id, user_id, from_status, to_status)
  values (v_id, p_actor, null, v_status);

  return public.app_json(v_id, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- APP-03 update fields (not the status). `p_version` is the number the client last saw (null = do not check).
-- Only the keys present in p_patch change; a JSON null clears a nullable field.
-- ---------------------------------------------------------------------------
create function public.app_update(p_actor uuid, p_id uuid, p_patch jsonb, p_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.job_applications;
begin
  select * into v_row from public.job_applications where id = p_id and user_id = p_actor for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_version is not null and p_version <> v_row.version then
    raise exception 'VERSION_CONFLICT' using errcode = 'P0001';
  end if;

  update public.job_applications set
    company = case when p_patch ? 'company' then btrim(p_patch ->> 'company') else company end,
    role_title = case when p_patch ? 'role_title' then btrim(p_patch ->> 'role_title') else role_title end,
    source_url = case when p_patch ? 'source_url' then nullif(btrim(coalesce(p_patch ->> 'source_url', '')), '') else source_url end,
    deadline = case when p_patch ? 'deadline' then (p_patch ->> 'deadline')::date else deadline end,
    applied_on = case when p_patch ? 'applied_on' then (p_patch ->> 'applied_on')::date else applied_on end,
    notes = case when p_patch ? 'notes' then btrim(coalesce(p_patch ->> 'notes', '')) else notes end,
    version = version + 1
  where id = p_id;

  return public.app_json(p_id, p_actor);
end;
$$;

-- ---------------------------------------------------------------------------
-- APP-04 change the status and write the event, in one step. Setting "applied" fills the applied date once.
-- ---------------------------------------------------------------------------
create function public.app_change_status(
  p_actor uuid, p_id uuid, p_to text, p_note text, p_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.job_applications;
begin
  select * into v_row from public.job_applications where id = p_id and user_id = p_actor for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_version is not null and p_version <> v_row.version then
    raise exception 'VERSION_CONFLICT' using errcode = 'P0001';
  end if;
  if p_to = v_row.status then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  update public.job_applications set
    status = p_to,
    applied_on = case when p_to = 'applied' and applied_on is null then current_date else applied_on end,
    version = version + 1
  where id = p_id;

  insert into public.application_events (application_id, user_id, from_status, to_status, note)
  values (p_id, p_actor, v_row.status, p_to, btrim(coalesce(p_note, '')));

  return public.app_json(p_id, p_actor);
end;
$$;

revoke all on function public.app_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_create(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.app_update(uuid, uuid, jsonb, integer) from public, anon, authenticated;
revoke all on function public.app_change_status(uuid, uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.app_json(uuid, uuid) to service_role;
grant execute on function public.app_create(uuid, jsonb) to service_role;
grant execute on function public.app_update(uuid, uuid, jsonb, integer) to service_role;
grant execute on function public.app_change_status(uuid, uuid, text, text, integer) to service_role;
