-- Team Finder (migration 20261107000000). Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002,
-- student1 ...0003 (level 2), student2 ...0004, student3 ...0005 (level 1), pending ...0006, suspended ...0007.
-- Beta: admin bbbbbbbb-1000-...-0001, student1 ...0003. Skills: TypeScript ...888, React ...889.
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
create function pg_temp.mk_post(p_actor uuid, p_title text, p_roles jsonb default null, p_deadline timestamptz default null)
returns uuid language sql as $$
  select (public.tf_create_post(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', 'hackathon', p_title, 'Building something fun.', p_deadline, null, null,
    coalesce(p_roles, '[{"role_name":"Backend developer","slots":1,"skill_ids":["88888888-8888-4888-8888-888888888888"]},{"role_name":"UI designer","slots":2,"skill_ids":[]}]'::jsonb)) ->> 'id')::uuid
$$;
create function pg_temp.notes(p_user uuid, p_type text) returns bigint language sql as
  $$ select count(*) from public.notifications where user_id = p_user and type = p_type $$;
create function pg_temp.role_id(p_post uuid, p_name text) returns uuid language sql as
  $$ select id from public.team_post_roles where post_id = p_post and role_name = p_name $$;
create function pg_temp.req(p_actor uuid, p_post uuid, p_role text, p_msg text default 'I can help') returns uuid language sql as
  $$ select (public.tf_create_request(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', p_post, pg_temp.role_id(p_post, p_role), p_msg) ->> 'id')::uuid $$;
create function pg_temp.listed(p_actor uuid, p_post uuid, p_status text default 'open') returns boolean language sql as
  $$ select exists (select 1 from public.tf_list_posts(p_actor, 'aaaaaaaa-0000-4000-8000-000000000001', null, p_status, null, null, false, 50) l where l.id = p_post) $$;

-- ===== clients cannot touch anything =========================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');
select throws_ok($$select public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'hackathon', 'Hello there', 'x', null, null, null, '[]')$$, '42501', null, 'a signed-in student cannot call the server functions directly');
select throws_ok($$select * from public.team_posts$$, '42501', null, 'nor read posts');
select throws_ok($$select * from public.join_requests$$, '42501', null, 'nor read requests');
select throws_ok($$select * from public.team_post_private$$, '42501', null, 'nor read the team links');
select throws_ok($$insert into public.team_posts (college_id, author_id, kind, title) values ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003', 'project', 'Direct insert')$$, '42501', null, 'nor write posts');
reset role;
set local role anon;
select throws_ok($$select * from public.team_posts$$, '42501', null, 'anon cannot read posts');
reset role;

-- ===== TMF-01 create =========================================================
insert into t select 'p1', pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000005', 'Smart campus hackathon team');
select is((select status from public.team_posts where id = (select v from t where k = 'p1')), 'open', 'a level 1 student creates an open post');
select is((select count(*) from public.team_post_roles where post_id = (select v from t where k = 'p1')), 2::bigint, 'with 2 roles');
select is((select count(*) from public.team_post_role_skills where role_id = pg_temp.role_id((select v from t where k = 'p1'), 'Backend developer')), 1::bigint, 'and the skill of the first role');
select is((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) -> 'roles' -> 0 -> 'skills' ->> 0), 'TypeScript', 'the role shows the skill name');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000006', 'Pending cannot post')$$, 'P0001', 'FORBIDDEN', 'a pending member cannot create');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000007', 'Suspended cannot post')$$, 'P0001', 'FORBIDDEN', 'nor a suspended one');
select throws_ok($$select pg_temp.mk_post('bbbbbbbb-1000-4000-8000-000000000003', 'Other college post')$$, 'P0001', 'FORBIDDEN', 'nor a member of another college');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Deadline in the past', null, now() - interval '1 day')$$, 'P0001', 'VALIDATION_FAILED', 'a past deadline is refused');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Deadline too far', null, now() + interval '181 days')$$, 'P0001', 'VALIDATION_FAILED', 'a deadline later than 180 days is refused');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'No roles at all', '[]'::jsonb)$$, 'P0001', 'VALIDATION_FAILED', 'no roles is refused');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Too many roles', (select jsonb_agg(jsonb_build_object('role_name', 'R' || g, 'slots', 1, 'skill_ids', '[]'::jsonb)) from generate_series(1, 9) g))$$, 'P0001', 'VALIDATION_FAILED', 'more than 8 roles is refused');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Zero slots', '[{"role_name":"X","slots":0,"skill_ids":[]}]'::jsonb)$$, '23514', null, '0 slots is refused by the table');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Unknown skill', '[{"role_name":"X","slots":1,"skill_ids":["99999999-9999-4999-8999-999999999999"]}]'::jsonb)$$, 'P0001', 'VALIDATION_FAILED', 'an unknown skill is refused');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'abcd')$$, '23514', null, 'a title shorter than 5 is refused');
select throws_ok($$select public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'hackathon', 'Plain http link', 'x', null, 'http://example.org', null, '[{"role_name":"X","slots":1,"skill_ids":[]}]')$$, '23514', null, 'a link that is not https is refused');
select is((select count(*) from public.team_posts where title in ('Deadline in the past', 'Zero slots', 'No roles at all')), 0::bigint, 'refused creates left nothing behind (whole transaction undone)');
update public.college_settings set min_level_to_post = 2 where college_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000005', 'Level too low for this college')$$, 'P0001', 'VERIFICATION_LEVEL_TOO_LOW', 'the college can require level 2 to post');
update public.college_settings set min_level_to_post = 1 where college_id = 'aaaaaaaa-0000-4000-8000-000000000001';

-- ===== TMF-02 list and filters ===============================================
insert into t select 'p2', pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Design sprint for the fest', '[{"role_name":"Illustrator","slots":1,"skill_ids":["88888888-8888-4888-8888-888888888893"]}]'::jsonb, now() + interval '10 days');
update public.team_posts set kind = 'project' where id = (select v from t where k = 'p2');
-- now() is frozen inside one test transaction, so give the rows different times on purpose.
update public.team_posts set created_at = now() + interval '1 minute' where id = (select v from t where k = 'p2');
select ok(pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1')), 'a classmate sees the open post');
select throws_ok($$select * from public.tf_list_posts('bbbbbbbb-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, false, 10)$$, 'P0001', 'FORBIDDEN', 'a member of another college cannot list this college');
select throws_ok($$select * from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, false, 10)$$, 'P0001', 'FORBIDDEN', 'nor a pending member');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'project', 'open', null, null, false, 50)), 1::bigint, 'the kind filter works');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'open', '88888888-8888-4888-8888-888888888893', null, false, 50)), 1::bigint, 'the skill filter works');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'open', null, 'hackathon', false, 50)), 1::bigint, 'search finds words in the title or description');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'open', null, '%', false, 50)), 0::bigint, 'a % in the search is a plain character');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', null, null, null, null, true, 50)), 1::bigint, 'mine=true lists only my own posts');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'open', null, null, false, 1)), 1::bigint, 'the limit is respected');
select is((select item ->> 'id' from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'open', null, null, false, 50) order by created_at desc, id desc limit 1), (select v::text from t where k = 'p2'), 'newest first');
select is((select count(*) from public.tf_list_posts('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', null, 'open', null, null, false, 50, (select created_at from public.team_posts where id = (select v from t where k = 'p2')), (select v from t where k = 'p2'))), 1::bigint, 'the cursor skips what was already shown');

-- A post past its deadline is shown as expired and cannot take requests
insert into t select 'p3', pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000003', 'Old competition team', null, now() + interval '2 days');
update public.team_posts set deadline = now() - interval '1 hour' where id = (select v from t where k = 'p3');
select ok(not pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p3')), 'an expired post is not in the open list');
select ok(pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p3'), 'expired'), 'but it is in the expired list');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p3'), 'Backend developer')$$, 'P0001', 'CONFLICT', 'nobody can request a role on an expired post');

-- ===== TMF-03 detail =========================================================
select public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), '{"team_link":"https://chat.example.org/room1"}'::jsonb);
select is((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) ->> 'team_link'), 'https://chat.example.org/room1', 'the author sees the team link');
select is((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) ->> 'team_link'), null, 'a classmate does not');
select ok((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) ? 'pending_requests'), 'the author sees the pending count');
select ok(not (public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) ? 'pending_requests'), 'a classmate does not');
select throws_ok($$select public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid())$$, 'P0001', 'NOT_FOUND', 'an unknown post is NOT_FOUND');

-- ===== TMF-04 edit ===========================================================
select is((public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), '{"title":"Smart campus hackathon team (v2)"}'::jsonb) ->> 'title'), 'Smart campus hackathon team (v2)', 'the owner edits the title');
select throws_ok($$select public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), '{"title":"Hijacked title"}'::jsonb)$$, 'P0001', 'FORBIDDEN', 'someone else cannot edit it');
select throws_ok($$select public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), '{"deadline":"2020-01-01T00:00:00Z"}'::jsonb)$$, 'P0001', 'VALIDATION_FAILED', 'a past deadline is refused on edit too');
select is((public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), '{"team_link":null}'::jsonb) ->> 'title'), 'Smart campus hackathon team (v2)', 'a team link can be cleared');
select is((select count(*) from public.team_post_private where post_id = (select v from t where k = 'p1')), 0::bigint, 'and is gone');

-- ===== TMF-06 request a role =================================================
insert into t select 'r1', pg_temp.req('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'p1'), 'Backend developer');
select is((select status from public.join_requests where id = (select v from t where k = 'r1')), 'pending', 'a request starts pending');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000005', 'team.request_received'), 1::bigint, 'the owner was told');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'p1'), 'Backend developer')$$, 'P0001', 'ALREADY_REQUESTED', 'asking twice for the same role is ALREADY_REQUESTED');
select is((select count(*) from public.join_requests where applicant_id = 'aaaaaaaa-1000-4000-8000-000000000003' and post_id = (select v from t where k = 'p1')), 1::bigint, 'and no second row exists');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000005', (select v from t where k = 'p1'), 'UI designer')$$, 'P0001', 'FORBIDDEN', 'the owner cannot ask to join their own post');
select throws_ok($$select public.tf_create_request('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), pg_temp.role_id((select v from t where k = 'p2'), 'Illustrator'), 'wrong role')$$, 'P0001', 'NOT_FOUND', 'a role of another post is NOT_FOUND');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000006', (select v from t where k = 'p1'), 'UI designer')$$, 'P0001', 'FORBIDDEN', 'a pending member cannot ask');
select throws_ok($$select pg_temp.req('bbbbbbbb-1000-4000-8000-000000000003', (select v from t where k = 'p1'), 'UI designer')$$, 'P0001', 'FORBIDDEN', 'nor another college');
select public.block_user('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-1000-4000-8000-000000000005');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1'), 'UI designer')$$, 'P0001', 'NOT_FOUND', 'a blocked pair cannot see each other''s posts');
select ok(not pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1')), 'and the post is not in the list');
select public.unblock_user('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-1000-4000-8000-000000000005');

-- ===== TMF-07 owner sees requests ============================================
insert into t select 'r2', pg_temp.req('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1'), 'Backend developer', 'Me too');
update public.join_requests set created_at = now() - interval '1 hour' where id = (select v from t where k = 'r1');
select is((select count(*) from public.tf_list_requests('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), 'pending', 50)), 2::bigint, 'the owner sees both pending requests');
select is((select item -> 'applicant' ->> 'display_name' from public.tf_list_requests('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), 'pending', 50) order by created_at limit 1), 'Riya Sharma', 'with the applicant name');
select ok((select not (item -> 'applicant' ? 'email') from public.tf_list_requests('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), 'pending', 50) limit 1), 'and no email address');
select throws_ok($$select * from public.tf_list_requests('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), null, 50)$$, 'P0001', 'FORBIDDEN', 'someone else cannot list them');
select is((select count(*) from public.tf_list_my_requests('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, 50)), 1::bigint, 'an applicant sees their own requests');

-- ===== TMF-08 decision (one slot for the backend role: AC-TMF-004 one at a time) ===
select throws_ok($$select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r2'), 'accepted', null)$$, 'P0001', 'FORBIDDEN', 'an applicant cannot decide');
select throws_ok($$select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r1'), 'maybe', null)$$, 'P0001', 'VALIDATION_FAILED', 'only accepted or declined');
select is((public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r1'), 'accepted', 'Welcome!') -> 'role' ->> 'filled'), '1', 'the owner accepts the first request: the role is 1 of 1');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000003', 'team.request_accepted'), 1::bigint, 'the applicant was told');
select throws_ok($$select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r2'), 'accepted', null)$$, 'P0001', 'SLOTS_FULL', 'accepting a second one for the same single slot is SLOTS_FULL');
select is((select status from public.join_requests where id = (select v from t where k = 'r2')), 'pending', 'and that request stays pending');
select throws_ok($$select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r1'), 'declined', null)$$, 'P0001', 'CONFLICT', 'an already decided request is CONFLICT');
select is((public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r2'), 'declined', 'Slot is taken') -> 'request' ->> 'status'), 'declined', 'the other can be declined');
select is((select decision_note from public.join_requests where id = (select v from t where k = 'r2')), 'Slot is taken', 'with the note');
select ok((select payload ->> 'message' from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000004' and type = 'team.request_declined') like '%Slot is taken%', 'which the applicant sees');
select is((select status from public.team_posts where id = (select v from t where k = 'p1')), 'open', 'the post stays open while a role has slots');
select is((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) -> 'my_requests' -> 0 ->> 'status'), 'accepted', 'an applicant sees their own request status on the post');

-- team link goes to accepted members
select public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'), '{"team_link":"https://chat.example.org/room1"}'::jsonb);
select is((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) ->> 'team_link'), 'https://chat.example.org/room1', 'an accepted member sees the team link');
select is((public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1')) ->> 'team_link'), null, 'a declined applicant does not');

-- all roles full: the post is filled and the others are cancelled
insert into t select 'r3', pg_temp.req('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1'), 'UI designer');
insert into t select 'r4', pg_temp.req('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'p1'), 'UI designer');
insert into t select 'r5', pg_temp.req('aaaaaaaa-1000-4000-8000-000000000002', (select v from t where k = 'p1'), 'UI designer');
select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r3'), 'accepted', null);
select is((select status from public.team_posts where id = (select v from t where k = 'p1')), 'open', 'one of two UI slots filled: still open');
select public.tf_decide_request('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r4'), 'accepted', null);
select is((select status from public.team_posts where id = (select v from t where k = 'p1')), 'filled', 'every role full: the post is filled');
select is((select status from public.join_requests where id = (select v from t where k = 'r5')), 'cancelled', 'the request still waiting is cancelled');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000002', 'team.request_cancelled'), 1::bigint, 'and its applicant was told');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000007', (select v from t where k = 'p1'), 'UI designer')$$, 'P0001', 'FORBIDDEN', 'a suspended member still cannot ask');

-- ===== TMF-09 withdraw =======================================================
select throws_ok($$select public.tf_withdraw_request('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r4'))$$, 'P0001', 'NOT_FOUND', 'only the applicant can withdraw');
select is((select count(*) from public.audit_logs where action = 'team.accepted_member_withdrew'), 0::bigint, 'no withdrawal audit row yet');
select is((public.tf_withdraw_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r4'), 'req-wd1') ->> 'status'), 'withdrawn', 'an accepted member withdraws');
select is((select filled from public.team_post_roles where id = pg_temp.role_id((select v from t where k = 'p1'), 'UI designer')), 1::smallint, 'the slot is free again');
select is((select status from public.team_posts where id = (select v from t where k = 'p1')), 'open', 'a filled post opens again');
select is((select action from public.audit_logs where request_id = 'req-wd1'), 'team.accepted_member_withdrew', 'and the withdrawal is in the audit log');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000005', 'team.request_withdrawn'), 1::bigint, 'the owner was told');
select throws_ok($$select public.tf_withdraw_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'r4'))$$, 'P0001', 'CONFLICT', 'withdrawing twice is CONFLICT');
select lives_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'p1'), 'UI designer')$$, 'after withdrawing, the person can ask again');
select is((public.tf_withdraw_request('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.join_requests where applicant_id = 'aaaaaaaa-1000-4000-8000-000000000003' and status = 'pending' and post_id = (select v from t where k = 'p1'))) ->> 'status'), 'withdrawn', 'a pending request can be withdrawn too');
select is((select count(*) from public.audit_logs where action = 'team.accepted_member_withdrew'), 1::bigint, 'and that did not write an audit row');

-- ===== TMF-05 close ==========================================================
insert into t select 'p4', pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000004', 'Startup idea needs a team');
insert into t select 'r6', pg_temp.req('aaaaaaaa-1000-4000-8000-000000000003', (select v from t where k = 'p4'), 'UI designer');
select throws_ok($$select public.tf_close_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p4'))$$, 'P0001', 'FORBIDDEN', 'only the owner closes a post');
select is((public.tf_close_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p4')) ->> 'status'), 'closed', 'the owner closes it');
select is((select status from public.join_requests where id = (select v from t where k = 'r6')), 'cancelled', 'the waiting request is cancelled');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000003', 'team.request_cancelled'), 1::bigint, 'and its applicant was told');
select throws_ok($$select public.tf_close_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p4'))$$, 'P0001', 'CONFLICT', 'closing twice is CONFLICT');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000005', (select v from t where k = 'p4'), 'UI designer')$$, 'P0001', 'CONFLICT', 'a closed post takes no requests');
select throws_ok($$select public.tf_update_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p4'), '{"title":"Edit after close"}'::jsonb)$$, 'P0001', 'CONFLICT', 'and cannot be edited');

-- ===== reports on team posts =================================================
select is((public.create_report('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'team_post', (select v from t where k = 'p1'), 'scam') ->> 'status'), 'open', 'a member reports a team post');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'team_post', (select v from t where k = 'p1'), 'scam')$$, 'P0001', 'VALIDATION_FAILED', 'but not their own');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'team_post', gen_random_uuid(), 'scam')$$, 'P0001', 'NOT_FOUND', 'an unknown post is NOT_FOUND');
select is((select target_title from public.mod_list_reports('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'open', 10) where target_id = (select v from t where k = 'p1')), 'Smart campus hackathon team (v2)', 'the queue shows the post title');
select lives_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.reports where target_id = (select v from t where k = 'p1')), 'hide', 'Looks like a scam', 'req-hide1')$$, 'a moderator hides the post');
select ok(not pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1')), 'it disappears from the list');
select throws_ok($$select public.tf_get_post('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v from t where k = 'p1'))$$, 'P0001', 'NOT_FOUND', 'and from the detail');
select throws_ok($$select pg_temp.req('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p1'), 'UI designer')$$, 'P0001', 'NOT_FOUND', 'and nobody can ask to join it');
select ok(pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000005', (select v from t where k = 'p1'), 'open'), 'the author still sees their own post');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000005', 'moderation.hidden'), 1::bigint, 'and was told it was hidden');
select is((select action from public.audit_logs where request_id = 'req-hide1'), 'report.content_hidden', 'with one audit row');

-- ===== the author leaves the college ========================================
update public.memberships set status = 'left' where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and college_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select ok(not pg_temp.listed('aaaaaaaa-1000-4000-8000-000000000004', (select v from t where k = 'p2')), 'posts of someone who left are not shown');

-- ===== at most 10 open posts per person ======================================
select lives_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000005', 'Extra post number ' || g) from generate_series(1, 9) g$$, 'a person can have 10 open posts');
select throws_ok($$select pg_temp.mk_post('aaaaaaaa-1000-4000-8000-000000000005', 'One post too many')$$, 'P0001', 'RATE_LIMITED', 'the 11th is RATE_LIMITED');

select * from finish();
rollback;
