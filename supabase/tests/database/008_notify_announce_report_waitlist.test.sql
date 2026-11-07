-- Notifications, announcements, reports and moderation, blocks, waitlist (migration 0005).
-- Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, student1 ...0003, student2 ...0004,
-- student3 ...0005, pending ...0006, suspended ...0007. Beta: admin bbbbbbbb-1000-...-0001, student1 ...0003.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
create function pg_temp.alpha_audit() returns bigint language sql as
  $$ select count(*) from public.audit_logs where college_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$;
create function pg_temp.notes(p_user uuid, p_type text) returns bigint language sql as
  $$ select count(*) from public.notifications where user_id = p_user and type = p_type $$;

-- ===== who may call what ====================================================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000001');
select throws_ok($$select public.mod_create_announcement('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'x', 'y', false)$$, '42501', null, 'a signed-in moderator cannot call the server functions directly');
select throws_ok($$select public.join_waitlist('a', 'b', 'c@d.test', 'other')$$, '42501', null, 'nor the waitlist function');
select throws_ok($$select public.notify_user('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'report.actioned', 't', 'm')$$, '42501', null, 'nor notify_user');
select throws_ok($$insert into public.notifications (user_id, college_id, type) values ('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'report.actioned')$$, '42501', null, 'nobody inserts a notification from the client');
select throws_ok($$select * from public.waitlist_leads$$, '42501', null, 'nobody reads the waitlist from the client');
select throws_ok($$insert into public.reports (college_id, target_type, target_id, reason) values ('aaaaaaaa-0000-4000-8000-000000000001', 'announcement', gen_random_uuid(), 'spam')$$, '42501', null, 'nobody inserts a report from the client');
select throws_ok($$insert into public.blocks (blocker_id, blocked_id) values ('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000003')$$, '42501', null, 'nobody inserts a block from the client');
reset role;
set local role anon;
select throws_ok($$select * from public.notifications$$, '42501', null, 'anon cannot read notifications');
select throws_ok($$select * from public.announcements$$, '42501', null, 'anon cannot read announcements');
reset role;

-- ===== the decision tells the applicant ======================================
insert into public.verification_requests (membership_id, college_id, method, status)
select m.id, m.college_id, 'manual', 'pending' from public.memberships m where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000006';
select lives_ok($$select public.admin_decide_verification('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
  (select r.id from public.verification_requests r join public.memberships m on m.id = r.membership_id where m.user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), 'approved')$$, 'an approval works');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000006', 'membership.approved'), 1::bigint, 'the applicant got one membership.approved notification');
select is((select payload ->> 'title' from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), 'You are in', 'with a title');
select ok((select payload ->> 'message' from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000006') like '%Alpha College%', 'and a message that names the college');
select is((select payload ->> 'college_slug' from public.notifications where user_id = 'aaaaaaaa-1000-4000-8000-000000000006'), 'alpha', 'and the college slug');

-- ===== announcements ========================================================
select is(pg_temp.alpha_audit(), 2::bigint, 'so far 2 audit rows (seed and the approval)');
select throws_ok($$select public.mod_create_announcement('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Hello', 'World', false)$$, 'P0001', 'FORBIDDEN', 'a student cannot create an announcement');
select throws_ok($$select public.mod_create_announcement('bbbbbbbb-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Hello', 'World', false)$$, 'P0001', 'FORBIDDEN', 'the admin of another college cannot either');
select is(pg_temp.alpha_audit(), 2::bigint, 'refused creates wrote no audit row');

select is((public.mod_create_announcement('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Hackathon sign-ups', 'Teams of 3 or 4.', true, null, null, 'req-ann1') ->> 'status'), 'published', 'an admin creates a published announcement');
select is(pg_temp.alpha_audit(), 3::bigint, 'one audit row');
select is((select action from public.audit_logs where request_id = 'req-ann1'), 'announcement.created', 'announcement.created');
select is((select count(*) from public.notifications where type = 'announcement.published'), 5::bigint, 'the 5 other active members were told (admin, moderator, 3 students, plus the approved one, minus the author)');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000001', 'announcement.published'), 0::bigint, 'the author was not told');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000007', 'announcement.published'), 0::bigint, 'a suspended member was not told');
select is(pg_temp.notes('bbbbbbbb-1000-4000-8000-000000000003', 'announcement.published'), 0::bigint, 'nobody in Beta was told');

select is((public.mod_create_announcement('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Library closed', 'Closed on Friday.', false, null, null, 'req-ann2') ->> 'title'), 'Library closed', 'a moderator can create one too');
select throws_ok($$select public.mod_create_announcement('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Bad dates', 'x', false, now(), now() - interval '1 day')$$, 'P0001', 'VALIDATION_FAILED', 'an end before the start is refused');
-- Planned for later, already ended, draft.
select public.mod_create_announcement('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Later', 'Planned', false, now() + interval '2 days', null, 'req-later');
select is((select count(*) from public.notifications where payload ->> 'message' = 'Later'), 0::bigint, 'an announcement planned for later does not notify yet');
insert into public.announcements (college_id, author_id, title, body, status, publish_at, expires_at)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001', 'Old news', 'Ended', 'published', now() - interval '3 days', now() - interval '1 day'),
       ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001', 'Draft idea', 'Not yet', 'draft', now(), null);

select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');
select is((select array_agg(title order by pinned desc, publish_at desc) from public.announcements_list('aaaaaaaa-0000-4000-8000-000000000001', 10)), array['Hackathon sign-ups', 'Library closed'], 'a student sees the 2 current ones, the pinned one first');
select is((select count(*) from public.announcements_list('aaaaaaaa-0000-4000-8000-000000000001', 1)), 1::bigint, 'the page size is respected');
select is((select title from public.announcements_list('aaaaaaaa-0000-4000-8000-000000000001', 10, 1, (select publish_at from public.announcements where title = 'Hackathon sign-ups'), (select id from public.announcements where title = 'Hackathon sign-ups'))), 'Library closed', 'the cursor gives the next page');
select is((select count(*) from public.announcements), 2::bigint, 'RLS: a student cannot read drafts, ended or future announcements');
reset role;
select pg_temp.act_as('bbbbbbbb-1000-4000-8000-000000000003');
select is((select count(*) from public.announcements_list('aaaaaaaa-0000-4000-8000-000000000001', 10)), 0::bigint, 'a Beta student sees no Alpha announcements');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000002');
select is((select count(*) from public.announcements), 5::bigint, 'RLS: a moderator can read all 5 rows of the college (including draft, ended, future)');
select is((select count(*) from public.announcements_list('aaaaaaaa-0000-4000-8000-000000000001', 10)), 2::bigint, 'but the member list function still shows only the current ones');
reset role;

select is((public.mod_update_announcement('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.announcements where title = 'Library closed'), '{"pinned": true, "title": "Library closed Friday"}'::jsonb, 'req-upd') ->> 'title'), 'Library closed Friday', 'a moderator can edit');
select is((select action from public.audit_logs where request_id = 'req-upd'), 'announcement.updated', 'announcement.updated');
select is((select metadata -> 'changed' from public.audit_logs where request_id = 'req-upd'), '["pinned", "title"]'::jsonb, 'the audit row lists the changed fields');
select is((public.mod_update_announcement('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.announcements where title = 'Draft idea'), '{"status": "removed"}'::jsonb, 'req-rm') ->> 'status'), 'removed', 'a moderator can remove');
select is((select action from public.audit_logs where request_id = 'req-rm'), 'announcement.removed', 'announcement.removed');
select throws_ok($$select public.mod_update_announcement('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.announcements where title = 'Draft idea'), '{"pinned": true}'::jsonb)$$, 'P0001', 'CONFLICT', 'a removed announcement cannot be changed');
select throws_ok($$select public.mod_update_announcement('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.announcements where title = 'Old news'), '{"pinned": true}'::jsonb)$$, 'P0001', 'FORBIDDEN', 'a student cannot change one');
select throws_ok($$select public.mod_update_announcement('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', (select id from public.announcements where title = 'Old news'), '{"pinned": true}'::jsonb)$$, 'P0001', 'NOT_FOUND', 'the admin of Beta cannot change an Alpha announcement (NOT_FOUND)');
select throws_ok($$select public.mod_update_announcement('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.announcements where title = 'Old news'), '{}'::jsonb)$$, 'P0001', 'VALIDATION_FAILED', 'an empty change is refused');
select ok((select count(*) from public.mod_list_announcements('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 20)) >= 5, 'the moderator list shows all announcements including removed ones');
select throws_ok($$select * from public.mod_list_announcements('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 20)$$, 'P0001', 'FORBIDDEN', 'a student cannot use the moderator list');

-- ===== notifications: read, mark read, own only ==============================
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');
select is((select count(*) from public.notifications), 2::bigint, 'a student sees only their own 2 notifications (the two announcements)');
select is((select count(*) from public.notifications where user_id <> 'aaaaaaaa-1000-4000-8000-000000000003'), 0::bigint, 'and none of anyone else');
update public.notifications set read_at = now();
select is((select count(*) from public.notifications where read_at is not null), 2::bigint, 'a student can mark their own notifications read');
select throws_ok($$update public.notifications set payload = '{}'::jsonb$$, '42501', null, 'but cannot change anything else');
select throws_ok($$delete from public.notifications$$, '42501', null, 'or delete it');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000004');
with changed as (update public.notifications set read_at = now() where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' returning 1)
select is((select count(*) from changed), 0::bigint, 'nobody marks someone else''s notification read (0 rows)');
reset role;

-- ===== reports ==============================================================
select is((public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'announcement', (select id from public.announcements where title = 'Library closed Friday'), 'spam', 'Looks wrong') ->> 'status'), 'open', 'a student reports an announcement');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'announcement', (select id from public.announcements where title = 'Library closed Friday'), 'spam')$$, 'P0001', 'CONFLICT', 'the same report twice is CONFLICT');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'announcement', gen_random_uuid(), 'spam')$$, 'P0001', 'NOT_FOUND', 'an unknown target is NOT_FOUND');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'bbbbbbbb-1000-4000-8000-000000000003', 'spam')$$, 'P0001', 'NOT_FOUND', 'a person of another college cannot be reported here (NOT_FOUND)');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000003', 'spam')$$, 'P0001', 'VALIDATION_FAILED', 'you cannot report yourself');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'team_post', gen_random_uuid(), 'spam')$$, 'P0001', 'NOT_FOUND', 'an unknown team post is NOT_FOUND (team posts can be reported since Day 5)');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000004', 'spam')$$, 'P0001', 'FORBIDDEN', 'a suspended member cannot report');
select throws_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000004', 'rude')$$, '23514', null, 'an unknown reason is refused');
select lives_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000004', 'harassment', 'Rude messages')$$, 'a student reports a classmate');
select lives_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000005', 'scam')$$, 'and another one');
select lives_ok($$select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000002', 'spam')$$, 'and the moderator');

select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');
select is((select count(*) from public.reports), 4::bigint, 'a reporter sees their own 4 reports');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000004');
select is((select count(*) from public.reports), 0::bigint, 'another student sees none');
reset role;

select is((select count(*) from public.mod_list_reports('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'open', 10)), 4::bigint, 'a moderator sees the 4 open reports');
select is((select target_title from public.mod_list_reports('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'open', 10) where target_type = 'announcement'), 'Library closed Friday', 'with the title of the reported announcement');
select is((select reporter_name from public.mod_list_reports('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'open', 1)), 'Riya Sharma', 'and the name of the reporter');
select throws_ok($$select * from public.mod_list_reports('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', null, 10)$$, 'P0001', 'FORBIDDEN', 'a student cannot see the queue');
select is((select count(*) from public.mod_list_reports('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', null, 10)), 0::bigint, 'Beta sees none of Alpha''s reports');

-- Moderator actions. Each one: exactly one audit row.
create function pg_temp.report_for(p_type text, p_target uuid) returns uuid language sql as
  $$ select id from public.reports where target_type = p_type and target_id = p_target and status = 'open' $$;

select is(pg_temp.alpha_audit(), (select count(*) from public.audit_logs where college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'baseline audit count taken');
create temp table audit_base as select pg_temp.alpha_audit() as n;

select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'dismiss')$$, 'P0001', 'FORBIDDEN', 'a student cannot act on a report');
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'warn')$$, 'P0001', 'VALIDATION_FAILED', 'warn needs a note');
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'warn', 'no')$$, 'P0001', 'VALIDATION_FAILED', 'a note under 5 characters is refused');
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'ban', 'a good reason')$$, 'P0001', 'VALIDATION_FAILED', 'an unknown action is refused');
select throws_ok($$select public.mod_act_on_report('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'dismiss')$$, 'P0001', 'NOT_FOUND', 'the admin of another college cannot act on this report (NOT_FOUND)');
select is(pg_temp.alpha_audit() - (select n from audit_base), 0::bigint, 'refused actions wrote no audit row');

-- warn
select is((public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'warn', 'Please be polite', 'req-warn') -> 'report' ->> 'status'), 'actioned', 'warn marks the report actioned');
select is((select action from public.audit_logs where request_id = 'req-warn'), 'report.owner_warned', 'report.owner_warned');
select is(pg_temp.alpha_audit() - (select n from audit_base), 1::bigint, 'exactly one audit row');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000004', 'moderation.warned'), 1::bigint, 'the owner got a warning notification');
select is((select payload ->> 'message' from public.notifications where type = 'moderation.warned'), 'Please be polite', 'with the note');
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000003', 'report.actioned'), 1::bigint, 'the reporter was told the report was reviewed');
select is((select count(*) from public.moderation_actions where action = 'warn'), 1::bigint, 'a moderation action row exists');
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', (select id from public.reports where target_id = 'aaaaaaaa-1000-4000-8000-000000000004'), 'dismiss')$$, 'P0001', 'CONFLICT', 'a handled report is CONFLICT');

-- dismiss needs no note
select is((public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000005'), 'dismiss', null, 'req-dis') -> 'report' ->> 'status'), 'dismissed', 'dismiss needs no note');
select is((select action from public.audit_logs where request_id = 'req-dis'), 'report.dismissed', 'report.dismissed');
select is(pg_temp.alpha_audit() - (select n from audit_base), 2::bigint, 'one more audit row');

-- A moderator never handles a report about themselves.
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000002'), 'dismiss')$$, 'P0001', 'FORBIDDEN', 'a moderator cannot handle a report about themselves');

-- hide announcement: gone from the member list
select is((public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('announcement', (select id from public.announcements where title = 'Library closed Friday')), 'hide', 'Misleading information', 'req-hide') -> 'report' ->> 'status'), 'actioned', 'hide marks the report actioned');
select is((select action from public.audit_logs where request_id = 'req-hide'), 'report.content_hidden', 'report.content_hidden');
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000003');
select is((select array_agg(title) from public.announcements_list('aaaaaaaa-0000-4000-8000-000000000001', 10)), array['Hackathon sign-ups'], 'the hidden announcement no longer appears in the member list');
select is((select count(*) from public.announcements where title = 'Library closed Friday'), 0::bigint, 'nor through RLS');
reset role;
select is(pg_temp.notes('aaaaaaaa-1000-4000-8000-000000000002', 'moderation.hidden'), 1::bigint, 'the author was told the content was hidden');

-- hide profile: classmates stop seeing it
select public.create_report('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000004', 'inappropriate', 'Again');
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000005');
select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), 1::bigint, 'before hiding, a classmate sees the profile');
reset role;
select lives_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000004'), 'hide', 'Offensive photo', 'req-hp')$$, 'a moderator hides a profile');
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000005');
select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), 0::bigint, 'after hiding, classmates no longer see it');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000004');
select is((select count(*) from public.profiles where user_id = 'aaaaaaaa-1000-4000-8000-000000000004'), 1::bigint, 'the owner still sees their own profile');
reset role;

-- suspend
select public.create_report('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', 'profile', 'aaaaaaaa-1000-4000-8000-000000000003', 'harassment', 'Threats');
select is((public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000003'), 'suspend', 'Threats to a classmate', 'req-sus') -> 'report' ->> 'status'), 'actioned', 'a moderator can suspend a student through a report');
select is((select status from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'suspended', 'the student is suspended');
select is((select status_reason from public.memberships where user_id = 'aaaaaaaa-1000-4000-8000-000000000003' and college_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'Threats to a classmate', 'with the reason');
select is((select action from public.audit_logs where request_id = 'req-sus'), 'report.member_suspended', 'report.member_suspended');
-- rank rules
insert into public.reports (college_id, reporter_id, target_type, target_id, reason)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000005', 'profile', 'aaaaaaaa-1000-4000-8000-000000000001', 'spam'),
       ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000005', 'profile', 'aaaaaaaa-1000-4000-8000-000000000002', 'scam');
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000001'), 'suspend', 'Trying to suspend an admin')$$, 'P0001', 'FORBIDDEN', 'a moderator cannot suspend an admin');
select throws_ok($$select public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000001'), 'suspend', 'Trying to suspend myself')$$, 'P0001', 'FORBIDDEN', 'nor can an admin suspend themselves through a report');
select is((public.mod_act_on_report('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', pg_temp.report_for('profile', 'aaaaaaaa-1000-4000-8000-000000000002'), 'suspend', 'Too many spam reports', 'req-sm') -> 'report' ->> 'status'), 'actioned', 'an admin can suspend a moderator');

-- ===== blocks ================================================================
select lives_ok($$select public.block_user('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'a student blocks a classmate');
select lives_ok($$select public.block_user('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'blocking again is harmless');
select is((select count(*) from public.blocks), 1::bigint, 'one row');
select is(public.is_blocked_between('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-1000-4000-8000-000000000005'), true, 'a block works both ways');
select is(public.is_blocked_between('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-1000-4000-8000-000000000005'), false, 'and only for those two');
select throws_ok($$select public.block_user('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-1000-4000-8000-000000000005')$$, 'P0001', 'VALIDATION_FAILED', 'you cannot block yourself');
select throws_ok($$select public.block_user('aaaaaaaa-1000-4000-8000-000000000005', 'bbbbbbbb-1000-4000-8000-000000000003')$$, 'P0001', 'NOT_FOUND', 'a person of another college is NOT_FOUND');
select throws_ok($$select public.block_user('aaaaaaaa-1000-4000-8000-000000000005', gen_random_uuid())$$, 'P0001', 'NOT_FOUND', 'a stranger id is NOT_FOUND');
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000005');
select is((select count(*) from public.blocks), 1::bigint, 'the blocker sees their own block');
reset role;
select pg_temp.act_as('aaaaaaaa-1000-4000-8000-000000000004');
select is((select count(*) from public.blocks), 0::bigint, 'the blocked person does not see it');
reset role;
select lives_ok($$select public.unblock_user('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-1000-4000-8000-000000000004')$$, 'unblock works');
select is((select count(*) from public.blocks), 0::bigint, 'and removes the row');

-- ===== waitlist ==============================================================
select is(public.join_waitlist('Gamma University', 'Test Person', 'Contact@Gamma.TEST', 'college_admin', 'landing'), true, 'the first sign up is new');
select is(public.join_waitlist('Gamma University', 'Test Person', 'contact@gamma.test', 'college_admin', 'landing'), false, 'the same email again is not new');
select is(public.join_waitlist('Other Name', 'Someone Else', '  CONTACT@gamma.test ', 'student'), false, 'even with different case, spaces and details');
select is((select count(*) from public.waitlist_leads), 1::bigint, 'there is exactly one row');
select is((select contact_email from public.waitlist_leads), 'contact@gamma.test', 'the email is stored lower case');
select throws_ok($$select public.join_waitlist('X', 'Y', 'z@z.test', 'president')$$, '23514', null, 'an unknown role is refused');

-- ===== housekeeping ==========================================================
update public.waitlist_leads set created_at = now() - interval '13 months';
select is(public.waitlist_purge(), 1::bigint, 'the purge removes sign ups older than 12 months');
update public.notifications set created_at = now() - interval '100 days' where type = 'membership.approved';
select ok(public.notifications_purge() >= 1, 'the purge removes notifications older than 90 days');

select * from finish();
rollback;
