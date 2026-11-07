# Connecting the screens to the real API (R2 for R3)

Written by R2 on Day 6 (R2-D6-2). It answers "what is real now, how do I call it, what will bite me". The exact shapes are in `src/contracts` and the rules per endpoint are in `docs/API_CONTRACT.md` (sections 7 to 10). Who may call what: `docs/PERMISSIONS.md`.

## 1. Run the real backend on your PC

1. Start Docker, then `pnpm db:start` and `pnpm db:reset` (loads the sample colleges and people).
2. Copy `.env.example` to `.env.local`. Fill the Supabase keys from `pnpm supabase status -o env` and make `APP_HASH_SECRET` with the command in the file. `NEXT_PUBLIC_API_MOCKING=disabled`.
3. `pnpm dev`. The API is at `http://localhost:3000/api/v1`.
4. Sign in codes arrive in Mailpit: http://127.0.0.1:54324 (6 digits, valid 10 minutes).

To work without a backend, set `NEXT_PUBLIC_API_MOCKING=enabled`. The sample answers are the contract fixtures, so a screen built on them keeps working when you switch to the real API. Day 4 and Day 5 endpoints are mocked in `src/mocks/handlers-day4-5.ts` (a test checks every sample against the contract).

## 2. Sample people (after `pnpm db:reset`)

| Email | Who | Notes |
|---|---|---|
| `admin@alpha.test` | Alpha admin | all admin and moderator screens |
| `moderator@alpha.test` | Alpha moderator | reports, announcements |
| `student1@alpha.test` | Riya, level 2 | |
| `student2@alpha.test` | Kabir | |
| `student3@alpha.test` | Ishaan, level 1 | tests the level rules |
| `pending@alpha.test` | waiting for approval | gets 403 `MEMBERSHIP_NOT_ACTIVE` |
| `suspended@alpha.test` | suspended | same 403 |
| `admin@beta.test`, `student1@beta.test` | another college | `/c/alpha/...` gives them 404 |

Sign in: `POST /auth/otp/request` with the email, read the code in Mailpit, `POST /auth/otp/verify`. The browser keeps the cookies. Never store a token yourself, and send every call with `credentials: "include"` (the shared `apiClient` already does).

## 3. Rules every call follows

- **Answers:** success is `{ data, meta }`, failure is `{ error: { code, message, details?, request_id } }`. Map `error.code` to your own wording (the list is `errorCodes` in `src/contracts/common.ts`). `VALIDATION_FAILED` has `details.fields[{ path, message }]` to put next to inputs.
- **Changes need the same origin.** A browser sends it. A script outside the browser must send a matching `Origin`.
- **IDEM endpoints** (marked IDEM in the contract) need an `Idempotency-Key` header with a fresh UUID for each user action. Reuse the same key for a retry of the same action, never for a new one. A retry returns the first answer with `Idempotent-Replay: true`. The same key with another body is 422. If the first call is still running, a retry gets 409 `CONFLICT` with `Retry-After: 1`: wait a second and send the same call again.
- **Lists** return `meta.next_cursor`. Send it back as `?cursor=`. Never build a cursor yourself. `limit` is 1 to 50 (default 20).
- **Limits:** 60 changes and 300 reads a minute per person (429 `RATE_LIMITED`, read `Retry-After`). Some endpoints have extra limits (listed in `docs/PERMISSIONS.md`).
- **Tabs switched off:** a call for a tab the college turned off answers 404 `FEATURE_DISABLED`. Hide the tab from `modules` and show a friendly "not available" page if someone still arrives.
- **Times** are UTC with a `Z`. Show them in the local time zone.
- **Another college is always 404**, never 403. A pending or suspended member is 403 `MEMBERSHIP_NOT_ACTIVE`.
- **Tabs:** `GET /colleges/public/{slug}` now has `modules: { campus, collaborate, career }`. Hide a tab when its value is false.

## 4. Screen to endpoint map

| Screen | Calls |
|---|---|
| Sign in, enter code | AUTH-01, AUTH-02 |
| College landing | TEN-01 (name, colour, join methods, `modules`) |
| Join (invite, college email, student form), pending, rejected | TEN-03, TEN-04, TEN-05, then TEN-02 to read the status |
| App shell (bell) | NTF-01 (`meta.unread_count`), NTF-02 |
| Announcements | ANN-01 (members), ANN-02 (moderators: create, edit, remove) |
| Report dialog, moderator queue | RPT-01, RPT-02, RPT-03 |
| Block a person | RPT-04 |
| Profile and skills | PRF-01, PRF-02, PRF-03, PRF-04 (PR 25), people directory PRF-05 |
| Team Finder browse, detail, create | TMF-02, TMF-03, TMF-01 |
| Team Finder request and my requests | TMF-06, TMF-10, TMF-09 |
| Team Finder my posts and requests inbox | TMF-02 with `mine=true`, TMF-07, TMF-08, TMF-05, TMF-04 |
| Admin console | ADM-03, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, ADM-10, ADM-11 |
| Opportunities list, filters, detail, save | OPP-01, OPP-02, OPP-04 (`saved=true` is "my saved") |
| Moderator opportunity management | OPP-03 |
| Reminder setting | REM-01 |
| Landing waitlist form | WL-01 |

## 5. Things that will surprise you (read once)

- A role is full when `filled >= slots`. A 409 `SLOTS_FULL` means somebody else was faster: reload the post.
- `my_requests` on a post says what the signed-in person already asked for. Use it to show Request, Requested or Accepted without another call.
- `team_link` is `null` for everyone except the author and accepted members. Do not show an empty "team chat" box.
- A post with a passed deadline arrives as `status: "expired"` even before any clean up runs.
- The default Team Finder list is `status=open`. Use `status=all` for "my history".
- `author.user_id` and `reporter.user_id` can be `null` after someone deleted their account. Show the `display_name` ("Former member").
- Notification `payload` always has `title` and `message` (plain text) plus ids for a link. Types are in `notificationType`.
- Avatars: send the image to `POST /me/avatar` (JPEG, PNG, WebP, GIF or AVIF, up to 2 MB, no SVG). Do not rely on the signed link flow yet.
- Opportunities: `changed_since_saved` is the "changed" badge, `status` can be `expired`, `location` can be an empty string. Deadline reminders arrive as the notification type `opportunity.deadline_soon`.
- The waitlist always says `joined: true`, even for an email that is already there. That is on purpose.

## 6. Not built yet (do not call these)

AUTH-04 (delete account), TEN-06 (roster), TEN-07 (leave college), ADM-01, ADM-02, ADM-04, ADM-12, PRF-06 (view one person), PRF-07 (achievements), PRJ-01 to PRJ-06 (projects and portfolio) and APP-01 to APP-04 (the tracker, which is R3's). Opportunities (OPP-01 to OPP-04) and the reminder setting (REM-01) are built since Day 7. If a screen needs another one earlier, tell R2 which and why.

## 7. When something does not match

1. Run the call with the sample people above and compare with `src/contracts/fixtures/<id>.success.json`.
2. If the real answer differs from the contract, that is an R2 bug: send R2 the `request_id` from the error or the `X-Request-Id` header.
3. If the contract is missing a field a screen needs, ask R2 to add it to the contract first, so R4 and R5 see it too.
