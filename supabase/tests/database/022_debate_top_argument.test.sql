-- A debate carries its strongest argument for the preview on the card. Migration 20261139000000.
-- Users from supabase/seed.sql: student1 ...0003, student2 ...0004. Alpha is aaaaaaaa-0000-4000-8000-000000000001.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create temp table t (k text primary key, v text);
grant all on t to public;

insert into t select 'debate', (public.debate_create('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Chai or coffee?', '', 'food', 'Chai', 'Coffee', 24) ->> 'id');
select is((public.debate_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate')) -> 'top_argument'), 'null'::jsonb, 'a debate with no argument has no top argument');

select public.debate_pick_side('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate'), 0::smallint);
select public.debate_pick_side('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate'), 1::smallint);
insert into t select 'first', (public.debate_argue('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate'), 'Chai has masala', false) ->> 'id');
insert into t select 'second', (public.debate_argue('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate'), 'Coffee keeps you awake', true) ->> 'id');
update public.debate_arguments set created_at = now() - interval '1 hour' where id = (select v::uuid from t where k = 'first');
select is((public.debate_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate')) -> 'top_argument' ->> 'body'), 'Coffee keeps you awake', 'with no votes the newest point is shown');
select is((public.debate_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate')) -> 'top_argument' ->> 'anonymous')::boolean, true, 'it says when the point is anonymous');
select ok(not (public.debate_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate')) -> 'top_argument') ? 'author', 'and never carries an author');

select public.debate_argument_vote('aaaaaaaa-1000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'first'), true);
select is((public.debate_get('aaaaaaaa-1000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', (select v::uuid from t where k = 'debate')) -> 'top_argument' ->> 'body'), 'Chai has masala', 'a point with a strong-point vote becomes the top one');

select * from finish();
rollback;
