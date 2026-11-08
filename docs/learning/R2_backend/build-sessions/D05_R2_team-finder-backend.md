# Team Finder backend (database and API) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D5-1 / ADR-003, ADR-005 / https://github.com/manikanta7cheruku/studentos-app/pull/31 |
| Related docs | docs/API_CONTRACT.md section 10, docs/DATABASE.md section 15, docs/PERMISSIONS.md, docs/FEATURES_AND_JOURNEYS.md F-11, docs/PRD.md AC-TMF-004 |

## 1. What we are learning and why it is needed

Team Finder lets a student post a team they want to build ("hackathon team, need a backend developer and two designers"), lets classmates ask to join a role, and lets the poster accept or decline. The hard part is not the lists. It is making sure that a role with one slot never gets two people, that a double click never makes two requests, and that private things (the team chat link) stay private.

## 2. What problem it solves

- A student finds teammates inside their own college without sharing an email address.
- The poster controls who joins. The applicant is told the result.
- The board stays clean: posts expire, hidden or blocked content disappears, and a person cannot flood it (10 open posts, 10 waiting requests).

## 3. Concepts and terminology (short glossary)

- Post: one team call. Has a kind (project, startup, hackathon, competition), a deadline and 1 to 8 roles.
- Role: a seat in the team with a number of slots. `filled` counts accepted people.
- Join request: one person asking for one role. States: pending, accepted, declined, withdrawn, cancelled.
- Slot race: two accepts at the same time for the last slot (AC-TMF-004).
- Row lock (`for update`): the database makes the second transaction wait until the first one is finished.
- Partial unique index: "only one live request per person and role". Live means pending or accepted.
- Derived status: an open post past its deadline is shown as `expired` without waiting for a clean up job.

## 4. How it works internally (appropriate depth)

1. All data access goes through SQL functions called with the service role. The tables have row level security on and only "no" policies, so a browser can never read or write them directly (tested).
2. Every function starts with `tf_assert_member`: the person must be an active member with level 1. Writes also need the college's "level to post" setting. A suspended college refuses everything.
3. `tf_can_see` is the one rule for visibility: same college, not removed, not hidden by a moderator, the author still an active member, and nobody blocked the other. The author always sees their own post. Lists, detail, requests and reports all use it.
4. Create inserts the post, the roles (with their position, so the order is kept), the skills and the optional team link in one transaction.
5. Request: the post must be visible and open, the role must belong to the post, not your own post, the role must have a free slot, and the unique index stops a second live request. The owner gets a notification.
6. Decision: the function locks the post, then the role, then the request, in that order. Then it re-reads the slots. This is why two accepts at once give one 200 and one 409 `SLOTS_FULL` (tested with two real simultaneous calls). When every role is full the post becomes `filled`, and the other waiting requests are cancelled and their people told.
7. Withdraw after acceptance frees the slot, reopens a filled post, tells the owner and writes an audit row (`team.accepted_member_withdrew`).
8. Close cancels waiting requests and tells their people.
9. The team link lives in `team_post_private` and is returned only to the author and to accepted members.
10. Reports can now target team posts. A moderator `hide` sets `moderation_hidden_at`, and the post leaves every list.

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261107000000_team_finder.sql` (tables, `tf_*` functions, report extensions, new notification types).
- `src/contracts/teamfinder.ts` and fixtures `tmf-*`.
- `src/modules/teamfinder/teamfinder.admin.ts` (calls the functions).
- Routes under `src/app/api/v1/c/[slug]/`: `team-posts`, `team-posts/[id]`, `.../close`, `.../roles/[roleId]/requests`, `.../requests`, `join-requests/[id]/decision`, `join-requests/[id]`, `me/join-requests`.
- Used next by: R3 (Team Finder screens, requests inbox) with R4's parts from PR 26.

## 6. Request/response and data flow (diagram or numbered trace)

Accept the last slot:

1. Owner sends `POST /api/v1/c/alpha/join-requests/{id}/decision` `{ "decision": "accepted" }` with an `Idempotency-Key`.
2. `memberContext` checks origin, login, active membership, write limit.
3. `tf_decide_request` locks post, role, request. It checks owner, pending and open. It re-reads the slots. If full: 409 `SLOTS_FULL`.
4. It adds one to `filled`, marks the request accepted, tells the applicant. If all roles are full it marks the post `filled` and cancels the rest.
5. The answer `{ request, role }` is stored under the key and returned.

## 7. API methods, endpoints, schemas, status codes

See docs/API_CONTRACT.md section 10. Codes: 200, 201, 400, 401, 403 (`FORBIDDEN`, `MEMBERSHIP_NOT_ACTIVE`, `VERIFICATION_LEVEL_TOO_LOW`), 404, 409 (`CONFLICT`, `ALREADY_REQUESTED`, `SLOTS_FULL`), 429 (including the 10 open posts and 10 waiting requests caps).

## 8. Database changes and relationships

New tables: `team_posts`, `team_post_private`, `team_post_roles`, `team_post_role_skills`, `join_requests`. New notification types. `create_report`, `mod_list_reports` and `mod_act_on_report` were extended for `team_post`. Details: docs/DATABASE.md section 15.

## 9. Authentication / authorization behaviour

Only active members of the college. The author rules (edit, close, see requests, decide) and the applicant rule (withdraw) are checked inside the functions. Another college gets 404 from the route. Pending and suspended members get 403. A moderator is not the owner, so a moderator cannot decide a request. Full table: docs/PERMISSIONS.md.

## 10. Errors and edge cases

- Same person, same role twice (also at the same instant): `ALREADY_REQUESTED`.
- Role full: `SLOTS_FULL`. Post closed, filled or past its deadline: `CONFLICT`.
- The author leaves the college: the post disappears from lists.
- Accepted member withdraws: slot freed, post reopens, audit row.
- Accepting after the post is closed: `CONFLICT`. Waiting requests are cancelled on close, so this only happens with a stale screen.
- `now()` is frozen inside one transaction, so the database tests give rows different times on purpose to test ordering.
- Not done: nothing marks old posts `expired` in the table (the status is derived when read), a clean up job comes with Day 6 (expiry). Editing roles after creation is not supported (close and create a new post).

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:test              # 009_team_finder.test.sql: 113 checks
pnpm test:integration     # teamfinder.test.ts (18 tests) and the permission matrix
pnpm verify
```

Seen on 2026-11-07 (tools run directly with node):

- pgTAP: Files=9, Tests=508, PASS.
- Integration: 787 passed, 2 skipped on purpose, run twice in a row. Unit tests 377 passed. Lint, typecheck, format passed.
- Real race tests: two accepts at once give 200 and 409; two identical requests at once give 201 and 409.
- Mutation checks, each made tests fail and then passed after restoring: (1) slot check removed from accept, (2) team link shown to everyone, (3) unique live request index removed, (4) hidden posts visible.

## 12. How to debug common failures

- 409 `SLOTS_FULL` for a person who sees a free slot: the screen is stale, reload the post.
- A post missing from the list: it may be expired (use `status=expired` or `all`), hidden by a moderator, or the author blocked you.
- 429 on creating a post: 10 open posts already. Close one.

## 13. Security considerations

- Tables are closed to clients, functions re-check the actor, ids from the URL are always checked against the college.
- The applicant list never shows an email address. Contact happens through the team link after acceptance.
- Links must be https. Search treats `%` and `_` as plain characters.
- AI wrote security sensitive SQL. A second human review is still needed (AI rule 7).

## 14. Alternatives and trade-offs

- Counting slots with `count(*)` of accepted requests instead of a `filled` column: no drift, but slower and harder to lock. We keep `filled` with a check constraint and lock the role row.
- Letting the browser read posts through row level security: fewer functions, but the visibility rule (blocks, hidden, author left) is shared by several queries. One function keeps it in one place.
- A separate table for the team link instead of a column: more joins, but a mistake in a list query can never leak it.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, pgTAP file, contracts, routes, integration tests, docs and this note from the R2 Day 5 roadmap line, docs/API_CONTRACT.md (TMF-01..09), docs/DATABASE.md, docs/PRD.md AC-TMF-004 and R4's team finder types. It proposed the mutation checks and the extra endpoint TMF-10 (my requests).

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: pgTAP, integration tests twice, unit tests, lint, typecheck, four mutation checks, two real concurrency tests.

Not done yet (open on purpose): a person has not read the SQL line by line, no second reviewer, R3 has not connected the screens, not run in CI yet (the pull request does that).

## 17. What each teammate can now explain/implement independently

R3: build the Team Finder screens from section 10 of the API contract (the `my_requests` field tells a screen whether to show Request, Requested or Accepted). R4: map `TeamPost` to the contract (roles carry `skills` names and `skill_ids`). R5: add concurrency tests to the staging suite.
