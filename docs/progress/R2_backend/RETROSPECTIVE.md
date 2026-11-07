# R2 backend retrospective (Days 1 to 10)

Written by R2 on 2026-11-07 (R2-D10-1). Plain words: what we did, what worked, what hurt, and what to change next time. Numbers are from the progress files and the commands run on each day.

## 1. The ten days in one table

| Day | What R2 delivered | Database checks | Integration tests | Unit tests |
|---|---|---|---|---|
| 1 | Database foundation, contracts and sample data | 94 | 0 | 167 |
| 2 | Email code sign in, joining a college | 177 | 46 | 186 |
| 3 | College admin API | 270 | 338 | 193 |
| 4 | Notifications, announcements, reports, waitlist; security check 1 | 395 | 584 | 314 |
| 5 | Team Finder | 508 | 787 | 377 |
| 6 | Safe retries, expiry, help for the frontend | 542 | 807 | 395 |
| 7 | Opportunities and reminders | 629 | 924 | 420 |
| 8 | Hardening (security check 2, limits, speed) | 629 | 940 | 431 |
| 9 | Docs match code, production database, three more endpoints | 673 | 984 | 450 |
| 10 | Release review and this retrospective | 673 | 984 | 450 |

(Day 1 database checks 94 and Day 2 numbers are the figures recorded on those days. Later numbers are the totals of all files.)

## 2. What went well

1. **Tests that try to break things.** Every task listed deliberate breaks (remove a rule, see a test fail, restore). That caught tests that passed for the wrong reason, for example a race test that did not race.
2. **Real database tests.** Running the routes against a real local Supabase found problems that no mock would: the people directory returned an error for every member, the avatars bucket did not exist, a setting let anyone sign up without email proof.
3. **Defence in depth.** The same rule is checked in the route and again inside the database function. During one break test the route check was removed and the database still refused, which is exactly why it is there.
4. **Rules written as tests, not as reminders.** The permission table, the endpoint registry, the generated API description and the docs checks fail the build when someone forgets. The first run of the docs checks found real drift.
5. **Small, repeatable pieces.** One function per action with one audit row, one error mapping, one way to paginate, one way to retry. New features (Team Finder, opportunities) reused them and needed few surprises.
6. **Honest records.** Every task says what was run, what was not, and what still needs a human. Nothing was marked Done without a second reader.

## 3. What went wrong or hurt

1. **No second reviewer for any task.** The project rule (AI rule 7) asks for a person who did not write the security code to read it. In ten days no R2 task got one. This is the biggest open gap and it is a people problem, not a code problem.
2. **Mocked tests hid a broken feature.** R3's people directory had passing unit tests with a fake database and returned an error for every real member. Lesson: every endpoint needs at least one test against the real database.
3. **A retry gap survived five days.** The Day 2 retry protection read first and wrote after, so two identical requests at the same moment both ran. Found on Day 6 while reading the code for another reason, not by a test. Concurrency needs its own tests from the day a feature is written.
4. **Lists must be checked when they grow.** Two lists were fine with 20 rows and slow with 4000. A speed test with a large table should exist from the first list.
5. **A list in three places drifts.** Notification types lived in the database, the contract and the docs. Two types were added to the database on Day 6 and forgotten in the contract until Day 7. The doc sync tests now check this class of mistake.
6. **Stacked pull requests had no CI and kept conflicting.** Pull requests based on other branches did not run CI (the workflow only runs for `main`), and every squash merge made the next one conflict in the same append-only documents. The fix each time was the same; the lesson is to base pull requests on `main` and merge them in order, or merge small and often.
7. **Some work depended on other roles and waited.** The tracker review (R2-D7-2) was blocked for two days because the tracker was not pushed. The answer to "what if the other role is late" should be agreed on Day 1 of a phase.
8. **Tooling friction.** The first days were slowed by an old Node version, a shell that broke on long text in the command line, and tools that could not be run in the normal way. Part of the Day 2 and Day 3 time went to this.
9. **The part of "production" that is code was small.** The code, scripts and checks for production were done in a day; the rest is accounts, keys, payments and decisions that only the owner can do. That list should have been given to the owner at the start of Phase 2, not on Day 9.

## 4. Surprises that tests or checks caught (examples)

| Day | Surprise | How it was found |
|---|---|---|
| 2 | A mail provider answers 429 for two codes within a second, so tests flaked | integration tests run twice in a row |
| 4 | SQL errors broke the error shape that the contract promises | the first integration test of an SQL error |
| 5 | Two accepts for the last slot both succeeded in a naive version | a deliberate break plus a real concurrent test |
| 6 | Identical requests at the same moment ran twice | reading the code for the maintenance task |
| 8 | Sign in had no Origin check | a new test that reads every route file |
| 8 | Team posts list was five times slower than needed | a speed test with 4000 rows |
| 9 | Local sign in auto confirmed emails | the environment check script |
| 9 | Five migrations and two settings missing from the docs | the doc sync tests, on their first run |

## 5. What to change next time

| Change | Why | Who |
|---|---|---|
| A reviewer is named for a security task on the day it starts, and reviews it the next day | The review gap above | R1 and R5 plan, owner enforces |
| Every endpoint gets one real database test and one concurrency or retry test in the same pull request | Items 2 and 3 above | R2, R3 |
| Add a registry line, a permission row and a contract line with the route, or the build fails | Already automatic since Day 9 | everyone |
| Base every pull request on `main`, merge in order, merge small | Item 6 above | everyone |
| A list endpoint is not finished until a speed test with thousands of rows exists | Item 4 above | R2, R3 |
| Give the owner the list of account and key tasks at the start of the phase that needs them | Item 9 above | R2, R5 |
| Agree a fallback when a role is late (who can take the task, or what is built against the contract meanwhile) | Item 7 above | R1 |
| Keep a short "how to run the tools" note at the top of the repository README for a fresh computer | Item 8 above | R5 |

## 6. Lessons about the work itself (for the learning folder)

1. A rule that protects other people should be checked twice, in the code and in the database.
2. A retry must claim its key before it does the work.
3. When two people can win the same thing, lock the thing and check again after the lock.
4. A document that is generated from code or checked against it by a test stays true. One written by hand does not.
5. Hide a private value in its own table, so a query written in a hurry cannot leak it.
6. Limits belong on reads and on request size as well as on writes.
7. A test with a fake database proves the code agrees with the fake. Use the real one at least once.
8. Write every list with the large case in mind: an index, a page, and a join instead of a function call for each row.
9. A feature flag has to be enforced where the data is, not only where the button is.
10. "Done" means a second person read it. Until then it is "in review", and the records say so.

## 7. What I would do next (after the first release)

1. Get the Days 1 to 9 code reviewed, then mark the tasks Done.
2. Run production setup with the owner and keep the `pnpm env:check --production` output as evidence.
3. Watch the first week of real use: sign in mail delivery, the hourly job, slow queries, error rate.
4. Build what was left out, in this order: delete account grace period and data export, projects and portfolio, the tracker reminders, roster import, platform admin screens.
5. Replace the draft "What I learned today" lines with the owner's own words, and hold the walkthrough drill for sign in, joining, approving, requesting a team seat and accepting it.
