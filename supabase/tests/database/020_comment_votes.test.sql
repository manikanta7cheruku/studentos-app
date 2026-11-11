-- Like and dislike on comments, migration 20261119000000.
-- Users from supabase/seed.sql: Alpha admin ...0001, students ...0003 to ...0005. Beta admin bbbbbbbb-1000-...-0001.
-- Alpha is aaaaaaaa-0000-4000-8000-000000000001, Beta bbbbbbbb-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

-- a client cannot call the function or read the table
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-1000-4000-8000-000000000003', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.idea_comment_votes$$, '42501', null, 'a client cannot read comment votes');
select throws_ok($$select public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', gen_random_uuid(), 1::smallint)$$, '42501', null, 'a client cannot call idea_comment_vote');
reset role;

insert into t select 'idea', (public.idea_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', '', 'Late night library hours', 'other') ->> 'id');
insert into t select 'comment', (public.idea_comment_create('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'), null, 'I would use it every night') ->> 'id');

select is((public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'comment'), 1::smallint) ->> 'score')::int, 1, 'a like makes the score 1');
select is((public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'comment'), 1::smallint) ->> 'score')::int, 1, 'liking twice changes nothing');
select is((public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'comment'), -1::smallint) ->> 'score')::int, 0, 'a dislike from someone else brings it to 0');
select is((public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'comment'), -1::smallint) ->> 'my_vote')::int, -1, 'my vote is shown');
select is((public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'comment'), 0::smallint) ->> 'score')::int, 1, 'taking the vote back restores the score');
select is((public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'comment'), -1::smallint) ->> 'score')::int, -1, 'switching a like to a dislike moves the score by two');
select throws_ok(format($$select public.idea_comment_vote('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', %L, 5::smallint)$$, (select v from t where k = 'comment')), 'P0001', 'VALIDATION_FAILED', 'a vote other than 1, -1 or 0 is refused');
select throws_ok(format($$select public.idea_comment_vote('bbbbbbbb-1000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', %L, 1::smallint)$$, (select v from t where k = 'comment')), 'P0001', 'NOT_FOUND', 'Beta cannot vote on an Alpha comment');
select is((select (c ->> 'score')::int from jsonb_array_elements(public.idea_comment_list('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'idea'))) c where c ->> 'id' = (select v from t where k = 'comment')), -1, 'the comment list carries the score');

select * from finish();
rollback;
