# Make the backend strong (security check 2, limits, speed, review follow-ups) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D8-1 / DECISIONS D-23 / https://github.com/manikanta7cheruku/studentos-app/pull/34 |
| Related docs | docs/PERMISSIONS.md, docs/CONNECTING_THE_API.md, docs/API_CONTRACT.md section 13, docs/DATABASE.md section 18 |

## 1. What we are learning and why it is needed

By Day 8 every feature exists. This task asks "what breaks under abuse or load, and what did earlier reviews leave open?". It combines the second security pass, limits, a speed check with thousands of rows, and the follow-ups from the review of R3's profile PR.

## 2. What problem it solves

- Other websites can no longer start a sign in from a visitor's browser (login CSRF).
- One account cannot scrape the whole college (300 reads a minute) or fill memory with a huge upload (the body is cut off at the limit while it is read).
- A college that switches a tab off now gets that tab's API closed too, not only its screens.
- Avatars: the bucket exists, accepts only real image types up to 2 MB, only inside the person's own folder, and the profile never points to a file that was not stored. SVG is gone.
- Saving the skill list cannot lose data halfway.
- The Team Finder list stays fast when a college has thousands of posts.
- New structural tests make it hard for a future route to forget these rules.

## 3. Concepts and terminology (short glossary)

- Login CSRF: another website makes the visitor's browser send a sign in request, so the visitor ends up signed in as someone else.
- Capped read: the server counts bytes while reading a body and stops at the limit, even if the sender gave no size or a false one.
- Feature flag: `college_settings.features.<tab> = false` switches a tab off (`campus`, `collaborate`, `career`).
- Sargable: written so the database can use an index.
- Structural test: a test that reads the source files and checks a rule for every route.

## 4. How it works internally (appropriate depth)

1. `readBodyCapped` reads a request body chunk by chunk and throws 413 as soon as the total passes the cap. `readJson` (100 KB) and the avatar route (2 MB plus form overhead) both use it.
2. OTP request and verify call `assertSameOrigin`, like every other write.
3. `limitReads` (300 a minute per person) runs in `memberContext` and `meContext` for reads. Writes keep 60 a minute, moderators and admins keep 120.
4. `memberContext({ module })` reads `college_settings.features` with the member's own rights and answers 404 `FEATURE_DISABLED` when the tab is off. Team Finder uses `collaborate`, announcements use `campus`. Opportunities check `career` inside the SQL.
5. The `avatars` bucket is created in a migration with a 2 MB limit and image types only (also for signed upload links). Storage rules let a person write only in the folder named after their own user id.
6. `uploadAvatar` throws if the upload fails and only then saves the path. The path is `<user id>/<time>-avatar.<ext>`.
7. `set_my_skills` replaces the list in one transaction (delete and insert), so a bad row leaves the old list untouched. An unknown skill id is a 400.
8. `tf_list_posts` writes the visibility and status rules as joins and plain comparisons instead of calling a function for every row.

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261110000000_hardening.sql`
- `src/lib/api.ts` (`readBodyCapped`), `src/lib/write-limit.ts` (`limitReads`), `src/modules/engagement/context.ts` (`assertModuleEnabled`, `memberContext` options), `src/lib/db-error.ts` (foreign key errors)
- `src/modules/profile/*`, `src/app/api/v1/me/avatar/*`, OTP routes
- Tests: `tests/integration/hardening.test.ts`, `tests/integration/performance.test.ts`, `tests/route-structure.test.ts`, `src/lib/body-limit.test.ts`

## 6. Request/response and data flow (diagram or numbered trace)

An avatar upload: the route reads the body with a cap, checks the real bytes (PNG, JPEG, WebP, GIF or AVIF, up to 2 MB), uploads to `avatars/<user id>/...` (the bucket checks type and size again, the storage rule checks the folder), and only after the upload works updates the profile.

## 7. API methods, endpoints, schemas, status codes

New rules for existing calls: reads can answer 429 after 300 a minute, tab calls can answer 404 `FEATURE_DISABLED`, uploads can answer 413 earlier, OTP calls can answer 403 from another website. SVG is no longer an avatar type.

## 8. Database changes and relationships

The `avatars` bucket and three storage policies, the function `set_my_skills`, a faster `tf_list_posts`. Details: docs/DATABASE.md section 18.

## 9. Authentication / authorization behaviour

Unchanged roles. Another college still gets plain 404 (the tab flags are only checked after the college check, so nothing leaks). A person can only write in their own storage folder.

## 10. Errors and edge cases (findings of this pass)

| # | Finding | Result |
|---|---|---|
| 1 | OTP request and verify had no Origin check (login CSRF, found by the new structural test) | Fixed |
| 2 | Reads were not limited | Fixed: 300 a minute |
| 3 | A body without Content-Length was read completely before the size check | Fixed: capped while reading |
| 4 | College tab flags were only enforced in screens | Fixed for Team Finder, announcements, opportunities |
| 5 | The avatars bucket did not exist: uploads failed and the code saved a made-up URL; SVG allowed; a signed upload link skipped the checks | Fixed |
| 6 | Saving skills deleted first and inserted after, without a transaction | Fixed |
| 7 | Team Finder list took 256 ms (first page) and 221 ms (deep page) with 4000 posts | Fixed: 48 ms and 44 ms |
| 8 | Announcements list takes about 124 ms with 4000 rows (the moderator rule runs for every row) | Open, within the limit. Carry-over |
| 9 | The signed upload link flow has no step that attaches the file to the profile (only `POST /me/avatar` does) | Open: R3 should use `POST /me/avatar` for now. Carry-over |
| 10 | Read limit and structural tests: a future route cannot forget the wrapper, the Origin check or the body cap | Added |

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm test                 # body-limit and route-structure tests (fast, no database)
pnpm test:integration     # hardening.test.ts (13), performance.test.ts (3), the rest
pnpm verify
```

Seen on 2026-11-07 (tools run directly with node): unit 431 passed, pgTAP Files=11, Tests=629, PASS, integration 940 passed, 2 skipped on purpose, twice in a row. Measured with 4000 rows each (p50): team posts 48 ms, opportunities 38 ms, notifications 38 ms, announcements 124 ms.

Mutation checks, each made tests fail, then passed after restoring: (1) the bucket without type and size limits, (2) the tab flag ignored, (3) the body cap removed, (4) the Origin check removed from OTP verify.

## 12. How to debug common failures

- 404 `FEATURE_DISABLED`: the college switched that tab off (see `modules` in TEN-01).
- 429 on reads: more than 300 reads in a minute for that person. Read `Retry-After`.
- Upload refused with 413: the file or the form is over 2 MB.
- The route-structure test names the route that broke a rule: add `route(...)`, the Origin check or the capped reader.

## 13. Security considerations

The rules above are the point of this task. No new packages. AI wrote security sensitive SQL and routes; a second human review is still needed (AI rule 7).

## 14. Alternatives and trade-offs

- A 300 a minute read limit costs one small database write per read. A cache in front would be cheaper but adds a new service.
- Checking the tab flag in each SQL function would be stricter, but a shared check at the route is easier to test. Opportunities use the SQL check because their functions were written first.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) chose the checks, wrote the migration, code, tests and docs, found the OTP gap through the structural test, and proposed the mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: all suites twice, the speed measurement, four mutation checks.

Not done yet (open on purpose): no person has read the SQL line by line, no second reviewer, no external scanner (R5-D8-1 does the scans), staging not checked.

## 17. What each teammate can now explain/implement independently

R3: handle 404 `FEATURE_DISABLED` and 429 on reads, upload avatars with `POST /me/avatar`. R5: scan the headers and limits on staging and add the speed test to the nightly run.
