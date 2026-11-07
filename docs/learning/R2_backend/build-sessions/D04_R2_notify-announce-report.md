# Notifications, announcements, reports and waitlist - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D4-1 / ADR-003, ADR-005 / https://github.com/manikanta7cheruku/studentos-app/pull/29 |
| Related docs | docs/API_CONTRACT.md section 9, docs/DATABASE.md section 14, docs/PERMISSIONS.md |

## 1. What we are learning and why it is needed

A college needs to talk to its members (announcements, notifications), keep the place safe (reports, moderation, blocks) and collect interest from colleges that are not live yet (waitlist). This task builds NTF-01/02, ANN-01/02, RPT-01 to RPT-04 and WL-01.

## 2. What problem it solves

- A moderator posts one announcement and every active member gets a notification.
- A member can report a profile or an announcement. A moderator can dismiss, hide, warn or suspend, and the reporter is told the outcome.
- Hidden content disappears from lists at once. The author is told why.
- A student blocks a classmate.
- A college that is not live can leave an email on the waitlist, safely, once.
- An applicant is told when an admin approves or rejects the join request (this was left open on Day 3).

## 3. Concepts and terminology (short glossary)

- Fan-out: one action creates a row for each recipient (an announcement creates one notification per member).
- Moderation action: what a moderator did to a report (`dismiss`, `hide`, `warn`, `suspend`). Stored in `moderation_actions` and in the audit log.
- Soft hide: content is not deleted. `moderation_hidden_at` (announcement) or `profile_hidden_at` (membership) makes it invisible to members. Moderators still see it.
- Self-handling rule: nobody handles a report about themselves or their own content.
- Unique open report: one person can have only one open report per target.
- Waitlist lead: an email and a college name, unique by lowercase email.

## 4. How it works internally (appropriate depth)

1. Member endpoints read with the person's own login, so Row Level Security (RLS) decides what comes back (`notifications_list`, `announcements_list` are `security invoker`). A member cannot see another person's notifications or a hidden announcement even if the TypeScript had a bug.
2. Moderator endpoints use `modContext` (origin check, `requireMember` with role moderator or admin, 120 a minute) and then call SQL functions through the service role. Each function calls `mod_assert` again.
3. `mod_create_announcement` inserts the row, writes the audit row `announcement.created` and, if it is published now, inserts one notification for each active member except the author. All in one transaction.
4. `mod_act_on_report` locks the report (`for update`), refuses handled (409) or own (403) reports, applies the action, writes a `moderation_actions` row and one audit row, and notifies the reporter and, for warn or hide, the owner.
5. Suspend rules: a moderator can suspend students, an admin also moderators, nobody suspends an admin here, and the member must be active.
6. `auth_shares_college_with` now ignores members whose profile is hidden, so a hidden profile disappears from people lists.
7. Announcement paging has a third cursor field (pinned or not) so pinned ones come first and no row is skipped or repeated.
8. The waitlist stores `lower(email)` with a unique constraint and `on conflict do nothing`. The route always answers `{ joined: true }`, so nobody can tell whether an email was already there. Limit: 5 an hour per IP, and the origin check.
9. Writes by members are limited to 60 a minute per person (`limitWrites`).

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261101000000_notifications_announcements_reports_waitlist.sql`
- `src/modules/engagement/` (`context.ts`, `engagement.admin.ts`, `reads.ts`), `src/lib/write-limit.ts`, `src/lib/cursor.ts` (extended), `src/lib/db-error.ts` (SQL `VALIDATION_FAILED` now carries `details.fields`)
- Routes: `me/notifications`, `me/notifications/read`, `c/[slug]/announcements`, `c/[slug]/admin/announcements` (+ `[id]`), `c/[slug]/reports`, `c/[slug]/admin/reports` (+ `[id]/action`), `me/blocks/[userId]`, `waitlist`.
- Used next by: R4's notification, announcement and report screens; R3 wires them. Day 5 and Day 7 will add report targets (team posts, opportunities).

## 6. Request/response and data flow (diagram or numbered trace)

Report an announcement, then hide it:

1. Student `POST /api/v1/c/alpha/reports` `{ target_type: "announcement", target_id, reason }` with an `Idempotency-Key`. The function checks the target is in this college, not the student's own, and that no open report exists. Answer 201.
2. Moderator `GET /api/v1/c/alpha/admin/reports?status=open` sees it with `target_title` and the reporter name.
3. Moderator `POST /api/v1/c/alpha/admin/reports/{id}/action` `{ action: "hide", note: "Misleading information" }`. One transaction: hide, action row, audit row `report.content_hidden`, notifications.
4. The student list no longer shows the announcement. The author sees a `moderation.hidden` notification. The reporter sees `report.actioned`.

## 7. API methods, endpoints, schemas, status codes

See docs/API_CONTRACT.md section 9. Codes: 200, 201, 400 `VALIDATION_FAILED`, 401, 403 (`FORBIDDEN`, `MEMBERSHIP_NOT_ACTIVE`), 404, 409 (already reported, already handled, removed announcement), 429.

## 8. Database changes and relationships

New: `notifications`, `announcements`, `reports`, `moderation_actions`, `blocks`, `waitlist_leads`. New columns: `memberships.profile_hidden_at`. Changed: `auth_shares_college_with`, `admin_decide_verification` (adds the notification). Details: docs/DATABASE.md section 14.

## 9. Authentication / authorization behaviour

Notifications: own rows only (RLS, and the only column a person may update is `read_at`). Announcements: members see current, published, not hidden ones. Moderators and admins see all and manage them. Reports: any active member creates, moderators and admins read and act. Blocks: own rows only, other college = 404. Waitlist: public, no login. Full table: docs/PERMISSIONS.md.

## 10. Errors and edge cases

- Reporting yourself: 400. Duplicate open report: 409. Target in another college or missing: 404. Team posts and projects are not reportable yet (400) because those tables arrive on Day 5 and Day 7.
- Hide, warn and suspend need a note of at least 5 characters. Dismiss does not.
- A removed announcement cannot be edited (409). Publishing in the future shows later, ending shows never after `expires_at`.
- A refused call writes no audit row.
- Blocking is stored and safe to repeat. Filtering blocked people out of team lists and posts is done by the Day 5 queries (the helper `is_blocked_between` exists).
- Not done: notification cleanup runs through `notifications_purge` but no schedule exists yet (needs a job, planned with Day 6 expiry work). Same for `waitlist_purge`.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:test              # 008_notify_announce_report_waitlist.test.sql: 125 checks
pnpm test:integration     # engagement.test.ts (24 tests) and the permission matrix
pnpm verify
```

Seen on 2026-11-07 (run directly with node because this session called the tools that way):

- pgTAP: Files=8, Tests=395, PASS.
- Integration: 452 passed, 2 skipped on purpose (run twice, after `db reset`). Unit: 310 passed. Lint, typecheck, format and build passed.
- Mutation checks, each made tests fail and then passed again after restoring: (1) hidden announcements shown to members, (2) waitlist unique rule removed, (3) write limit raised to 6000, (4) audit row skipped on report action.
- Note: pgTAP file 007 counts all audit rows, so run `db reset` before `db test` if you ran integration tests first.

## 12. How to debug common failures

- Empty notifications list for a new member: they get rows only for announcements published after they became active.
- 409 on report: an open report from this person for this target exists. Wait until a moderator handles it.
- 403 on a report action: the report is about your own content, or you are not allowed to suspend that role.
- 400 with `(body)` field: a rule in the database refused a value (for example an end date in the past).

## 13. Security considerations

- Moderator functions check the actor in the database too (tested: even without the TypeScript role check the students were still refused).
- Notification text is built on the server from known fields. The reason text is the moderator's note, shown only to the person it concerns.
- Waitlist answer never reveals if an email exists. The rate limit uses a hash of the IP. Email is only used for the college team to contact them.
- IDOR: every function filters by the college id.
- No new packages. AI wrote security sensitive SQL; a second human review is still needed (AI rule 7).

## 14. Alternatives and trade-offs

- Notification row per member (chosen) versus reading announcements and a "last seen" marker: per-member rows make unread counts and "mark read" simple, at the cost of more rows. Fine for one college size. A purge function keeps it small.
- Hiding versus deleting reported content: hiding keeps evidence and allows undo.
- Always answering `joined: true` hides duplicates but also hides a bad address typo. Accepted: format is checked, and the team can contact leads.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, pgTAP tests, routes, integration tests, docs and this note from the R2 Day 4 prompt, docs/API_CONTRACT.md and R4's draft screens. It proposed the four mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: pgTAP, integration tests twice, unit tests, build, four mutation checks.

Not done yet (open on purpose): no person has read the SQL line by line, no second reviewer, R4 has not connected the screens, not run in CI yet.

## 17. What each teammate can now explain/implement independently

R2: add another report target type or notification type. R4/R3: show a notification list with unread count and a report flow. R5: add rows to the permission matrix for new endpoints.
