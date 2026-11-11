-- Ideas (IDE-01 to IDE-08), Team Finder kinds and place, and college setup codes (COL-01), migration 20261114000000.
-- Users from supabase/seed.sql: Alpha admin ...0001, moderator ...0002, student1 ...0003, student2 ...0004, student3 ...0005.
-- Beta: admin bbbbbbbb-1000-...-0001. Alpha is aaaaaaaa-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- ===== clients cannot touch anything =========================================
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.ideas$$, '42501', null, 'a signed in client cannot read ideas');
select throws_ok($$select * from public.idea_votes$$, '42501', null, 'a signed in client cannot read votes');
select throws_ok($$select * from public.idea_comments$$, '42501', null, 'a signed in client cannot read comments');
select throws_ok($$select * from public.college_setup_codes$$, '42501', null, 'a signed in client cannot read setup codes');
select throws_ok($$select public.idea_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Hello there', 'x', 'other')$$, '42501', null, 'a signed in client cannot call the idea functions');
reset role;

-- ===== ideas ================================================================
insert into t select 'idea', (public.idea_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', '  A swap shelf in every hostel  ', 'Books go round.', 'campus') ->> 'id');
select is((public.idea_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea')) ->> 'title'), 'A swap shelf in every hostel', 'the title is trimmed');
select is((public.idea_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea')) ->> 'score')::int, 1, 'a new idea starts at 1 (the author up vote)');
select is((public.idea_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea')) ->> 'my_vote')::int, 1, 'the author has voted up');

select throws_ok($$select public.idea_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Hi', 'x', 'other')$$, '23514', null, 'a title under 5 characters is refused');
select throws_ok($$select public.idea_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'A fine title', 'x', 'nonsense')$$, '23514', null, 'an unknown topic is refused');
select throws_ok($$select public.idea_create('bbbbbbbb-1000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Not my college', 'x', 'other')$$, 'P0001', 'FORBIDDEN', 'a person of another college cannot post in Alpha');

-- Another college cannot see it.
select throws_ok(format($$select public.idea_get('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'idea')), 'P0001', 'NOT_FOUND', 'an idea of Alpha is not found in Beta');

-- Listing
select is((select count(*)::int from public.idea_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'new', null, false, 20) l where l.id = (select v::uuid from t where k = 'idea')), 1, 'a member sees it in the new list');
select is((select count(*)::int from public.idea_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'top', null, false, 20) l where l.id = (select v::uuid from t where k = 'idea')), 1, 'and in the top list');
select is((select count(*)::int from public.idea_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'new', 'sports', false, 20) l where l.id = (select v::uuid from t where k = 'idea')), 0, 'a topic filter leaves it out');
select is((select count(*)::int from public.idea_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'new', null, true, 20) l where l.id = (select v::uuid from t where k = 'idea')), 0, 'mine=true shows only my own ideas');

-- Votes
select is((public.idea_vote('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), 1::smallint) ->> 'score')::int, 2, 'an up vote adds one');
select is((public.idea_vote('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), 1::smallint) ->> 'score')::int, 2, 'the same vote twice changes nothing');
select is((public.idea_vote('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), -1::smallint) ->> 'score')::int, 0, 'changing up to down moves the score by two');
select is((public.idea_vote('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), 0::smallint) ->> 'score')::int, 1, 'taking the vote back returns to the author score');
select throws_ok($$select public.idea_vote('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid(), 1::smallint)$$, 'P0001', 'NOT_FOUND', 'voting on an unknown idea is not found');

-- Comments and replies
insert into t select 'c1', (public.idea_comment_create('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), null, 'I can take the first shelf.') ->> 'id');
select is((select comment_count from public.ideas where id = (select v::uuid from t where k = 'idea')), 1, 'the comment count goes up');
insert into t select 'c2', (public.idea_comment_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), (select v::uuid from t where k = 'c1'), 'Thank you.') ->> 'id');
select throws_ok(format($$select public.idea_comment_create('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L, %L, 'Too deep')$$, (select v from t where k = 'idea'), (select v from t where k = 'c2')), 'P0001', 'VALIDATION_FAILED', 'a reply to a reply is refused (one level only)');
select is(jsonb_array_length(public.idea_comment_list('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'))), 2, 'a member lists both comments');
select throws_ok(format($$select public.idea_comment_remove('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'c1')), 'P0001', 'FORBIDDEN', 'someone else cannot remove a comment');
select lives_ok(format($$select public.idea_comment_remove('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'c1')), 'the author removes their comment');
select is((select comment_count from public.ideas where id = (select v::uuid from t where k = 'idea')), 1, 'the comment count goes down');

-- Removing an idea: a stranger cannot, a moderator can, and it is gone for everyone.
select throws_ok(format($$select public.idea_remove('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'idea')), 'P0001', 'FORBIDDEN', 'another student cannot remove it');
select lives_ok(format($$select public.idea_remove('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'idea')), 'a moderator removes it');
select throws_ok(format($$select public.idea_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L)$$, (select v from t where k = 'idea')), 'P0001', 'NOT_FOUND', 'a removed idea is not found, even for its author');
select is((select count(*)::int from public.audit_logs where action = 'idea.removed' and target_id = (select v from t where k = 'idea')), 1, 'a removal by a moderator is written to the audit log');

-- ===== plans: sport and event, and the place =================================
insert into t select 'sport', (public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'sport', '5-a-side at the turf', 'Friendly game.', now() + interval '2 days', null, null, '[{"role_name":"Player","slots":10,"skill_ids":[]}]'::jsonb) ->> 'id');
select is((public.tf_post_json((select v::uuid from t where k = 'sport'), 'aaaaaaaa-1000-4000-8000-000000000003') ->> 'kind'), 'sport', 'the kind sport is accepted');
select is((public.tf_post_json((select v::uuid from t where k = 'sport'), 'aaaaaaaa-1000-4000-8000-000000000003') -> 'place'), 'null'::jsonb, 'a post has no place until one is set');
select lives_ok(format($$select public.tf_set_place('aaaaaaaa-1000-4000-8000-000000000003', %L, 'Greenfield Turf')$$, (select v from t where k = 'sport')), 'the author sets the place');
select is((public.tf_post_json((select v::uuid from t where k = 'sport'), 'aaaaaaaa-1000-4000-8000-000000000003') ->> 'place'), 'Greenfield Turf', 'the place is in the post json');
select throws_ok(format($$select public.tf_set_place('aaaaaaaa-1000-4000-8000-000000000004', %L, 'Hijacked')$$, (select v from t where k = 'sport')), 'P0001', 'NOT_FOUND', 'someone else cannot set the place');
select lives_ok(format($$select public.tf_set_place('aaaaaaaa-1000-4000-8000-000000000003', %L, '')$$, (select v from t where k = 'sport')), 'an empty place clears it');
select is((public.tf_post_json((select v::uuid from t where k = 'sport'), 'aaaaaaaa-1000-4000-8000-000000000003') -> 'place'), 'null'::jsonb, 'and it is null again');
insert into t select 'event', (public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'event', 'Open mic night', 'Bring a song.', now() + interval '3 days', null, null, '[{"role_name":"Guest","slots":20,"skill_ids":[]}]'::jsonb) ->> 'id');
select is((public.tf_post_json((select v::uuid from t where k = 'event'), 'aaaaaaaa-1000-4000-8000-000000000003') ->> 'kind'), 'event', 'the kind event is accepted');
select throws_ok($$select public.tf_create_post('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'party', 'Not a kind we know', 'x', null, null, null, '[{"role_name":"A","slots":1,"skill_ids":[]}]'::jsonb)$$, '23514', null, 'an unknown kind is still refused');

-- ===== college setup codes ===================================================
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', 'dddddddd-3000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner1@setup.test', now(), now(), '', '', '', '');

insert into t select 'code', public.make_college_setup_code('Gamma Institute', 14);
select is(char_length((select v from t where k = 'code')), 8, 'a setup code has 8 digits');
select is((select count(*)::int from public.college_setup_codes where code_hash = encode(sha256(convert_to((select v from t where k = 'code'), 'UTF8')), 'hex')), 1, 'only the hash is stored');
select throws_ok($$select public.make_college_setup_code('Too long', 90)$$, 'P0001', null, 'a code cannot last more than 30 days');

select throws_ok($$select public.college_setup_create('dddddddd-3000-4000-8000-000000000001', repeat('a', 64), 'gamma-inst', 'Gamma Institute', 'Gamma', 'Pune', 'MH', array['gamma.edu'], array['email_domain'], false)$$, 'P0001', 'FORBIDDEN', 'a wrong code is refused');

select lives_ok(format($$select public.college_setup_create('dddddddd-3000-4000-8000-000000000001', %L, 'gamma-inst', 'Gamma Institute', 'Gamma', 'Pune', 'MH', array['gamma.edu'], array['email_domain'], false)$$, encode(sha256(convert_to((select v from t where k = 'code'), 'UTF8')), 'hex')), 'the right code makes the college');
select is((select count(*)::int from public.colleges where slug = 'gamma-inst'), 1, 'the college exists');
select is((select m.role from public.memberships m join public.colleges c on c.id = m.college_id where c.slug = 'gamma-inst' and m.user_id = 'dddddddd-3000-4000-8000-000000000001'), 'college_admin', 'the person is its first admin');
select is((select count(*)::int from public.college_domains d join public.colleges c on c.id = d.college_id where c.slug = 'gamma-inst' and d.domain = 'gamma.edu'), 1, 'the email domain is saved');
select is((select s.require_admin_approval from public.college_settings s join public.colleges c on c.id = s.college_id where c.slug = 'gamma-inst'), false, 'the join rule is saved');
select isnt((select used_at from public.college_setup_codes where code_hash = encode(sha256(convert_to((select v from t where k = 'code'), 'UTF8')), 'hex')), null, 'the code is marked as used');
select throws_ok(format($$select public.college_setup_create('dddddddd-3000-4000-8000-000000000001', %L, 'gamma-two', 'Gamma Two', 'G2', 'Pune', 'MH', array[]::text[], array['manual'], true)$$, encode(sha256(convert_to((select v from t where k = 'code'), 'UTF8')), 'hex')), 'P0001', 'FORBIDDEN', 'the same code cannot be used twice');

-- An expired code, a taken address and a reserved address
insert into t select 'code2', public.make_college_setup_code('Delta', 14);
update public.college_setup_codes set expires_at = now() - interval '1 day' where code_hash = encode(sha256(convert_to((select v from t where k = 'code2'), 'UTF8')), 'hex');
select throws_ok(format($$select public.college_setup_create('dddddddd-3000-4000-8000-000000000001', %L, 'delta-inst', 'Delta Institute', 'Delta', 'Goa', 'GA', array[]::text[], array['manual'], true)$$, encode(sha256(convert_to((select v from t where k = 'code2'), 'UTF8')), 'hex')), 'P0001', 'FORBIDDEN', 'an expired code is refused');
insert into t select 'code3', public.make_college_setup_code('Epsilon', 14);
select throws_ok(format($$select public.college_setup_create('dddddddd-3000-4000-8000-000000000001', %L, 'gamma-inst', 'Another Gamma', 'AG', 'Pune', 'MH', array[]::text[], array['manual'], true)$$, encode(sha256(convert_to((select v from t where k = 'code3'), 'UTF8')), 'hex')), 'P0001', 'CONFLICT', 'a taken address is a conflict');
select throws_ok(format($$select public.college_setup_create('dddddddd-3000-4000-8000-000000000001', %L, 'global', 'Fake Global', 'FG', 'Pune', 'MH', array[]::text[], array['manual'], true)$$, encode(sha256(convert_to((select v from t where k = 'code3'), 'UTF8')), 'hex')), 'P0001', 'VALIDATION_FAILED', 'the address global is reserved');
select throws_ok(format($$select public.college_setup_create(null, %L, 'epsilon-inst', 'Epsilon', 'E', 'Pune', 'MH', array[]::text[], array['manual'], true)$$, encode(sha256(convert_to((select v from t where k = 'code3'), 'UTF8')), 'hex')), 'P0001', 'UNAUTHENTICATED', 'nobody signed in cannot set up a college');

select * from finish();
rollback;
