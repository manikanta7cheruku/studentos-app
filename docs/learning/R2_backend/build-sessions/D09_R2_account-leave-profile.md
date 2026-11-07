# Delete my account, leave a college, view a classmate - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D9-1 (gaps found while syncing the docs) / DECISIONS D-24 / PR_LINK9 |
| Related docs | docs/API_CONTRACT.md AUTH-04, TEN-07, PRF-06, docs/DATABASE.md section 20 |

## 1. What we are learning and why it is needed

Three endpoints in the contract were still missing and they matter for real students: AUTH-04 (a P0 privacy feature: delete my account), TEN-07 (leave a college) and PRF-06 (open a classmate's profile, needed to look at someone who asked to join a team).

## 2. What problem it solves

- A person can remove all of their data. It takes two steps so a stolen session alone cannot do it.
- A person can leave a college without leaving broken things behind (open posts, team seats, requests).
- A member can open one classmate's profile, under the same privacy rule as the people directory.

## 3. Concepts and terminology (short glossary)

- Two step confirmation: the same call twice. First it emails a code, then it needs the code.
- Blocker: the only admin of a college cannot delete their account or leave.
- Cascade: deleting the login account removes everything that points to it.
- Anonymous audit row: the log keeps the user id (a random number) but no name or email.

## 4. How it works internally (appropriate depth)

1. `DELETE /me` with `{}` checks blockers (`account_blockers`), then emails a code to the signed-in person's own address using the sign in code limits. With `{ code }` it checks the code against that same address, signs out every session, writes one `account.deleted` audit row per college (`account_delete_prepare`), removes the avatar files and deletes the account.
2. Deleting the account cascades to the profile, memberships, team posts and requests, notifications, saved items, skills and preferences. Reports they filed and announcements they wrote stay without their name.
3. `leave_college` locks the membership, gives back accepted team seats (`tf_withdraw_request`), withdraws waiting requests, closes open posts (`tf_close_post`), then sets the membership to `left` and writes `member.left`. A suspended or rejected person cannot leave (that would wash the record). The last admin is refused by the existing database rule.
4. `profile_view` returns one profile if both people are active members, the profile is visible, not hidden by a moderator, not deleted and nobody blocked the other. It always returns your own.

## 5. How it is used in StudentOS (files/modules)

`supabase/migrations/20261111000000_account_leave_profile.sql`, `src/modules/account/account.admin.ts`, routes `me/route.ts`, `c/[slug]/me/leave/route.ts`, `c/[slug]/people/[userId]/route.ts`, contracts in `auth.ts` and `profile.ts`.

## 6. Request/response and data flow (diagram or numbered trace)

Delete: `DELETE /me {}` -> 200 `{deletion_requested}` and an email -> `DELETE /me {code}` -> sessions ended, audit rows, files removed, account deleted -> 200 `{deleted: true}` -> the old cookie now gives 401.

## 7. API methods, endpoints, schemas, status codes

See docs/API_CONTRACT.md section 14. Codes: 200, 400 (`OTP_INVALID`, `VALIDATION_FAILED`), 401, 403, 404, 409 (only admin, already left), 410 (`OTP_EXPIRED`), 429.

## 8. Database changes and relationships

Four functions, no new table. Details in docs/DATABASE.md section 20.

## 9. Authentication / authorization behaviour

Delete and leave need only a login (they act on yourself). The profile view needs an active member of the college. Another college always gets 404.

## 10. Errors and edge cases

- The only admin of a college is refused with the college name, before any code is sent.
- A wrong code does not delete anything and counts toward the sign in lock (5 wrong codes).
- The code is checked on a separate client so no new session is created, and the code must belong to the signed-in account.
- Leaving and then joining again is allowed (a new waiting request).
- Not done: a grace period (a "deleted in 30 days unless you sign in" window) and a data export before deletion. The first release deletes at once after the code. The owner can decide to add a grace period.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:test              # 012_account_leave_profile.test.sql: 44 checks
pnpm test:integration     # account.test.ts (10 tests) and the permission matrix rows
```

Mutation checks, each made tests fail, then passed after restoring: a suspended member can leave; the profile view ignores hiding; the delete call skips the only-admin check; the delete call accepts any code.

## 12. How to debug common failures

- 409 on delete: the person is the only admin of a college. Make another person admin (ADM-09), then try again.
- No code arrived: sign in code limits apply (5 an hour); the mail provider may be slow (RB-03).

## 13. Security considerations

Two step confirmation, origin check, write limit, sign out of every session before deleting, no email in the audit log, the avatar files are removed with the account.

## 14. Alternatives and trade-offs

- Delete at once versus a 30 day grace period: simpler and what a privacy law expects ("erase on request"), but a mistake cannot be undone. The code step is the safety net.
- Soft delete (mark deleted, keep data): easier to restore, but it keeps personal data, which is the opposite of the request.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) found the gaps while checking the contract against the code, wrote the migration, routes, tests and docs, and proposed the mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: pgTAP, integration tests, four mutation checks.

Not done yet (open on purpose): no person has read the SQL line by line, no second reviewer, R3 has not built the settings screen, the deletion text for the privacy notice is not written (R1).

## 17. What each teammate can now explain/implement independently

R3: build "Settings: leave college / delete account" with the two step call. R1: write the privacy notice sentence about deletion and what the audit log keeps.
