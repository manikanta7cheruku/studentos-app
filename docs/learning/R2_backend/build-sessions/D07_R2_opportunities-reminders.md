# Opportunities, saved opportunities and reminders - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D7-1 / DECISIONS D-22 / PR_LINK7 |
| Related docs | docs/API_CONTRACT.md section 12, docs/DATABASE.md section 17, docs/PERMISSIONS.md, docs/FEATURES_AND_JOURNEYS.md F-14 and F-15 |

## 1. What we are learning and why it is needed

Students lose chances because opportunities live on scattered sites and deadlines slip. The college placement cell posts verified opportunities, students filter and save them, and the system reminds them before a deadline. This task builds the backend for that: OPP-01 to OPP-04 and the reminder setting REM-01.

## 2. What problem it solves

- One place per college for verified internships, jobs, hackathons, competitions and scholarships, each with a poster and a "last verified" date (no scraping).
- A student filters by kind, skills, work mode, location, deadline and search, and saves what interests them.
- If a moderator edits a listing after a student saved it, the student sees a "changed" badge.
- A notification arrives less than 48 hours before the deadline of a saved listing, once, unless the student turned reminders off.
- A college can switch the Career tab off and the API follows (FEATURE_DISABLED).

## 3. Concepts and terminology (short glossary)

- Curate: moderators and admins create, edit, verify and remove listings.
- Verified date: `last_verified_at`. A moderator can move it to now with `verified: true` without any other change.
- Derived status: a published listing past its deadline reads `expired` immediately; the maintenance run then marks the table.
- Changed badge: `changed_since_saved` is true when the listing was updated after this person saved it.
- Reminder: one row in `reminders` per person, listing and deadline date. The unique key stops a second one.
- Module flag: `college_settings.features.career`. A tab is on unless it is false.

## 4. How it works internally (appropriate depth)

1. Same pattern as Team Finder: the tables have row level security on and only "no" policies. The server calls SQL functions with the service role, and every function checks the actor again.
2. `opp_assert` allows an active member (level 1) of an active college whose Career tab is on. Otherwise FORBIDDEN, TENANT_SUSPENDED or FEATURE_DISABLED.
3. `opp_list` filters in SQL: kinds (several), skills (any of, case-insensitive), mode, location and search (with `%` and `_` treated as plain characters), deadline (any, 7d, 30d, hide_closed), saved only. Members see published and expired listings, never draft or removed. Newest first with a keyset cursor.
4. `opp_set_saved` works from the listing id alone (the route is `/me/saved-opportunities/{id}`): the college is the listing's college, and the caller must be an active member of it. Anything else is NOT_FOUND, so another college's ids are never confirmed.
5. Create, edit and remove (`mod_*_opportunity`) check the moderator again, validate through table constraints (https link, stipend range, up to 10 skills) and write exactly one audit row.
6. `reminders_run` (inside `maintenance_run`) finds saved listings closing within 48 hours for people who are still active members and have reminders on, inserts a `reminders` row (unique) and, only when the row is new, sends the notification `opportunity.deadline_soon`.
7. `maintenance_run` also marks listings past their deadline `expired` and deletes reminder rows older than 90 days.

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261109000000_opportunities_reminders.sql`
- `src/contracts/opportunities.ts` and fixtures `opp-*`, `rem-01`; `src/modules/opportunities/opportunities.admin.ts`
- Routes: `c/[slug]/opportunities` (+ `[id]`), `c/[slug]/admin/opportunities` (+ `[id]`), `me/saved-opportunities/[id]`, `me/reminder-settings`
- Sample handlers for R3 and R4: `src/mocks/handlers-day7.ts` (a test checks them against the contracts)
- Used by: R4's opportunities screens (PR 28, which had stand-in shapes marked TODO(R2)), R3's tracker ("Add to tracker").

## 6. Request/response and data flow (diagram or numbered trace)

Student saves a listing and is reminded:

1. `PUT /api/v1/me/saved-opportunities/{id}` -> `opp_set_saved` inserts the row.
2. A moderator edits the listing: `PATCH .../admin/opportunities/{id}` -> `updated_at` moves, audit row `opportunity.updated`. The student's next read shows `changed_since_saved: true`.
3. The listing's deadline is in 20 hours. The hourly maintenance call runs `reminders_run`: one `reminders` row, one notification. The next run changes nothing.

## 7. API methods, endpoints, schemas, status codes

See docs/API_CONTRACT.md section 12. Codes: 200, 201, 400, 401, 403 (`FORBIDDEN`, `MEMBERSHIP_NOT_ACTIVE`), 404 (`NOT_FOUND`, `FEATURE_DISABLED`), 409 (removed listing), 429.

## 8. Database changes and relationships

New tables `opportunities`, `saved_opportunities`, `user_prefs`, `reminders`; new notification type `opportunity.deadline_soon`; extended `maintenance_run`. Details: docs/DATABASE.md section 17.

## 9. Authentication / authorization behaviour

Members read, moderators and admins curate, students get 403 on curate calls, another college gets 404, pending and suspended members get 403. Saving only needs a login at the route, and the function then requires membership of the listing's college. Table: docs/PERMISSIONS.md.

## 10. Errors and edge cases

- A listing edited while saved: `changed_since_saved`. An edit does not move the verified date; only `verified: true` does.
- A removed listing cannot be edited (409) or saved (404). Saved rows stay, but the listing no longer appears in lists.
- Deadline reminders only for published listings closing within 48 hours, once per deadline date, not for people who left the college.
- Listings are scoped to one college. A platform wide list (visible to many colleges) is not built; the table has no null college.
- Not done: application tracker reminders (the tracker table belongs to R3 and is not merged yet), broken link reports, platform-curated listings.
- Stipend is an integer in paise a month so there are no decimals.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:test              # 011_opportunities_reminders.test.sql: 87 checks
pnpm test:integration     # opportunities.test.ts (17 tests) and the permission matrix
pnpm test                 # src/mocks/handlers-day7.test.ts: 11 tests
pnpm verify
```

Seen on 2026-11-07 (tools run directly with node): pgTAP Files=11, Tests=629, PASS. Integration 924 passed, 2 skipped on purpose, twice in a row. Unit 420. Lint, typecheck, format passed.

Mutation checks, each made tests fail, then passed after restoring: (1) drafts visible to members, (2) a draft can be saved, (3) reminder sent on every run, (4) Career tab flag ignored.

## 12. How to debug common failures

- 404 `FEATURE_DISABLED` for a member: the college switched the Career tab off (see `modules` in TEN-01).
- A listing missing from the list: it is a draft or removed, or the filters exclude it (try `deadline=any`).
- No reminder arrived: the maintenance call is not scheduled yet, reminders are off for that person, the deadline is more than 48 hours away, or the reminder for that deadline was already sent.

## 13. Security considerations

All access through functions that re-check the actor. Links must be https. Search terms are escaped. Posted-by shows the display name only. AI wrote security sensitive SQL; a second human review is still needed (AI rule 7).

## 14. Alternatives and trade-offs

- A "changed since saved" flag from `updated_at` is cheap but also fires for a verify-only edit. That is acceptable: the date shown to the student changed.
- A reminder per application deadline would be useful too. It waits for R3's tracker table instead of guessing its columns.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, pgTAP file, contracts, routes, sample handlers, integration tests, docs and this note from the roadmap line, docs/DATABASE.md, docs/FEATURES_AND_JOURNEYS.md F-14 and F-15, and R4's draft screens (to match the data they need). It proposed the four mutation checks and noticed that two Day 6 notification types were missing from the contract, and fixed it here.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: pgTAP, integration tests twice, unit tests, four mutation checks.

Not done yet (open on purpose): no person has read the SQL line by line, no second reviewer, R4 has not switched the screens to these shapes, not run in CI yet.

## 17. What each teammate can now explain/implement independently

R4: import the shapes from `@/contracts` instead of the stand-ins. R3: use `modules` and the saved flag, plan the tracker reminders with R2. R5: add a staging check for the Career flag.
