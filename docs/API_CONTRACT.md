> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 14 - API Contracts

| Field | Value |
|---|---|
| Doc ID | DOC-14 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 Tech Lead (contract owner). Change process: doc 26 §6 |
| Status | Proposed. Machine-readable file: `openapi.v1.json` (this folder), generated from the Zod schemas in `src/contracts` with `pnpm docs:openapi`. A test fails when it is out of date. |

## 1. Conventions
- **Base:** `/api/v1`. Tenant-scoped resources live under `/api/v1/c/{slug}/…`. Global resources under `/api/v1/me`, `/api/v1/auth`, `/api/v1/colleges/public`.
- **Format:** JSON, UTF-8, `snake_case` fields, ISO-8601 UTC timestamps, IDs are UUIDs.
- **Auth:** session cookie (HttpOnly, Secure, SameSite=Lax) or `Authorization: Bearer <jwt>` for tests/tools. CSRF: state-changing browser requests require a same-origin check + `Origin` validation (doc 19).
- **Authorization order:** authenticate → resolve tenant → membership active & level ≥ endpoint minimum → role → object-level check (RLS is final authority).
- **Success envelope:** `{ "data": <object|array>, "meta": { "request_id": "...", "next_cursor": "..." } }`.
- **Error envelope:** `{ "error": { "code": "SLOTS_FULL", "message": "That role was just filled.", "details": { }, "request_id": "..." } }`.
- **Pagination:** cursor-based: `?limit=20&cursor=<opaque>` (default 20, max 50). Stable order `created_at desc, id desc`.
- **Filtering/sorting:** whitelisted query params per endpoint; unknown params → `400 VALIDATION_FAILED`.
- **Idempotency:** `Idempotency-Key: <uuid>` required on create endpoints marked **IDEM**; replay within 24 h returns the original response with `Idempotent-Replay: true`; same key + different body → `422 IDEMPOTENCY_KEY_REUSED`.
- **Rate limits (proposed; headers `RateLimit-Limit/Remaining/Reset`):** OTP request 5/h/email and 20/h/IP; OTP verify 10/15 min/email; writes 60/min/user; reads 240/min/user; admin 120/min/user. Exceed → `429 RATE_LIMITED` with `Retry-After`.
- **Concurrency:** resources that can be edited concurrently carry `version`; send `If-Match: <version>` → mismatch `409 VERSION_CONFLICT`.
- **Request size:** JSON ≤ 100 KB; uploads via signed URL ≤ limits in NFR-013.

## 2. Error codes (stable)
| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Body/query invalid; `details.fields[]` |
| `UNAUTHENTICATED` | 401 | No/expired session |
| `FORBIDDEN` | 403 | Role/permission insufficient |
| `MEMBERSHIP_NOT_ACTIVE` | 403 | Pending/suspended/not a member |
| `VERIFICATION_LEVEL_TOO_LOW` | 403 | Tenant policy requires higher level |
| `TENANT_SUSPENDED` | 403 | Tenant suspended |
| `FEATURE_DISABLED` | 404 | Module flag off (indistinguishable from not found by design) |
| `NOT_FOUND` | 404 | Missing **or not visible** (never reveals cross-tenant existence) |
| `CONFLICT` | 409 | Generic state conflict |
| `VERSION_CONFLICT` | 409 | Stale `If-Match` |
| `SLOTS_FULL` | 409 | Team role has no free slots |
| `ALREADY_REQUESTED` | 409 | Duplicate join request |
| `INVITE_INVALID` / `INVITE_EXHAUSTED` / `INVITE_EXPIRED` | 400/409/410 | Invite issues |
| `OTP_INVALID` / `OTP_EXPIRED` | 400/410 | Code issues |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Same key, different body |
| `PAYLOAD_TOO_LARGE` | 413 | |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Bad upload MIME |
| `RATE_LIMITED` | 429 | |
| `UPSTREAM_UNAVAILABLE` | 503 | Email/storage/DB outage |
| `INTERNAL` | 500 | Unexpected; message generic; details in logs only |

## 3. Operations index (P0/P1 complete; P2/P3 reserved)
Legend: Auth = `pub` public · `ses` any signed-in user · `mem(n)` active member with level ≥ n · `mod` moderator+ · `adm` college admin · `plat` platform admin. Pri maps to doc 05 tiers. Tests = IDs in doc 20.

| Op ID | Method + path | Purpose | Auth | Pri | IDEM | Key tests |
|---|---|---|---|---|---|---|
| AUTH-01 | POST `/auth/otp/request` | Send email code | pub | P0 | | TC-AUTH-01..04 |
| AUTH-02 | POST `/auth/otp/verify` | Exchange code for session | pub | P0 | | TC-AUTH-05..08 |
| AUTH-03 | POST `/auth/logout` | End session (`?all=true`) | ses | P0 | | TC-AUTH-09 |
| AUTH-04 | DELETE `/me` | Request account deletion | ses | P0 | | TC-AUTH-10 |
| AUTH-05 | GET `/auth/google` | Start Continue with Google | pub | P0 | | TC-AUTH-11 |
| AUTH-06 | GET `/auth/google/callback` | Finish Continue with Google | pub | P0 | | TC-AUTH-12 |
| TEN-01 | GET `/colleges/public/{slug}` | Public branding + enabled methods | pub | P0 | | TC-TEN-01 |
| TEN-02 | GET `/c/{slug}/me/membership` | My status, level, method | ses | P0 | | TC-VER-01 |
| TEN-03 | POST `/c/{slug}/join/invite` | Redeem invite code | ses | P0 | ✓ | TC-VER-02..05 |
| TEN-04 | POST `/c/{slug}/join/manual` | Submit manual verification | ses | P0 | ✓ | TC-VER-06..08 |
| TEN-05 | POST `/c/{slug}/join/email-domain` | Start/complete domain verification | ses | P0 | | TC-VER-09..12 |
| TEN-09 | POST `/c/{slug}/join/open` | Join the Global space (unverified, level 1) | ses | P0 | ✓ | TC-VER-16 |
| TEN-06 | POST `/c/{slug}/join/roster` | Claim roster row | ses | P1 | ✓ | TC-VER-13..15 |
| TEN-07 | POST `/c/{slug}/me/leave` | Leave tenant | mem(0) | P1 | | TC-TEN-05 |
| PRF-01 | GET / PATCH `/me/profile` | Read/update own profile | ses | P0 | | TC-PRF-01..04 |
| PRF-02 | PUT `/me/skills` | Replace own skill list | mem(1) | P0 | | TC-PRF-05..07 |
| PRF-03 | GET `/skills?q=` | Skill autocomplete | ses | P0 | | TC-PRF-08 |
| PRF-04 | POST `/me/avatar/upload-url` | Signed upload URL | ses | P0 | | TC-PRF-09 |
| PRF-05 | GET `/c/{slug}/people?q=&skill=` | Directory search | mem(1) | P1 | | TC-PRF-10, TC-TEN-02 |
| PRF-06 | GET `/c/{slug}/people/{user_id}` | View a member | mem(1) | P1 | | TC-PRF-11 |
| PRF-07 | CRUD `/me/achievements` | Achievements | mem(1) | P1 | | TC-PRF-12 |
| PRJ-01 | POST `/c/{slug}/projects` | Create project | mem(1) | P1 | ✓ | TC-PRJ-01 |
| PRJ-02 | GET `/c/{slug}/projects?owner=` | List | mem(1) | P1 | | TC-PRJ-02 |
| PRJ-03 | GET/PATCH/DELETE `/c/{slug}/projects/{id}` | Read/update/delete | mem(1) (owner for write) | P1 | | TC-PRJ-03..05 |
| PRJ-04 | POST `/c/{slug}/projects/{id}/members` | Invite member | mem(1) owner | P1 | | TC-PRJ-06 |
| PRJ-05 | POST `/c/{slug}/projects/{id}/members/me/respond` | Confirm/decline | mem(1) | P1 | | TC-PRJ-07 |
| PRJ-06 | GET `/p/{handle}` | Public portfolio | pub | P1 | | TC-PRJ-08 |
| TMF-01 | POST `/c/{slug}/team-posts` | Create post with roles | mem(1) | P1 | ✓ | TC-TMF-01..03 |
| TMF-02 | GET `/c/{slug}/team-posts` | List/filter | mem(1) | P1 | | TC-TMF-04, TC-TEN-02 |
| TMF-03 | GET `/c/{slug}/team-posts/{id}` | Detail | mem(1) | P1 | | TC-TMF-05 |
| TMF-04 | PATCH `/c/{slug}/team-posts/{id}` | Edit (owner) | mem(1) | P1 | | TC-TMF-06 |
| TMF-05 | POST `/c/{slug}/team-posts/{id}/close` | Close | mem(1) owner | P1 | | TC-TMF-07 |
| TMF-06 | POST `/c/{slug}/team-posts/{id}/roles/{role_id}/requests` | Request to join | mem(1) | P1 | ✓ | TC-TMF-08..10 |
| TMF-07 | GET `/c/{slug}/team-posts/{id}/requests` | Owner sees requests | mem(1) owner | P1 | | TC-TMF-11 |
| TMF-08 | POST `/c/{slug}/join-requests/{id}/decision` | Accept/decline | mem(1) owner | P1 | ✓ | TC-TMF-12..14 |
| TMF-09 | DELETE `/c/{slug}/join-requests/{id}` | Withdraw | mem(1) applicant | P1 | | TC-TMF-15 |
| APP-01 | POST `/me/applications` | Create | ses | P1 | ✓ | TC-APP-01 |
| APP-02 | GET `/me/applications?status=&sort=deadline` | List | ses | P1 | | TC-APP-02 |
| APP-03 | GET/PATCH/DELETE `/me/applications/{id}` | Read/update/delete (`If-Match`) | ses owner | P1 | | TC-APP-03..06 |
| APP-04 | POST `/me/applications/{id}/status` | Change status w/ event | ses owner | P1 | | TC-APP-07 |
| OPP-01 | GET `/c/{slug}/opportunities` | List/filter | mem(1) | P1 | | TC-OPP-01 |
| OPP-02 | GET `/c/{slug}/opportunities/{id}` | Detail | mem(1) | P1 | | TC-OPP-02 |
| OPP-03 | POST/PATCH/DELETE `/c/{slug}/admin/opportunities…` | Curate | mod | P1 | ✓ | TC-OPP-03 |
| OPP-04 | PUT/DELETE `/me/saved-opportunities/{id}` | Save/unsave | mem(1) | P1 | | TC-OPP-04 |
| ANN-01 | GET `/c/{slug}/announcements` | List | mem(1) | P1 | | TC-ANN-01 |
| ANN-02 | POST/PATCH/DELETE `/c/{slug}/admin/announcements…` | Manage | mod | P1 | ✓ | TC-ANN-02 |
| NTF-01 | GET `/me/notifications` | List | ses | P1 | | TC-NTF-01 |
| NTF-02 | POST `/me/notifications/read` | Mark read | ses | P1 | | TC-NTF-02 |
| RPT-01 | POST `/c/{slug}/reports` | Create report | mem(1) | P0 | ✓ | TC-RPT-01 |
| RPT-02 | GET `/c/{slug}/admin/reports` | Queue | mod | P0 | | TC-RPT-02 |
| RPT-03 | POST `/c/{slug}/admin/reports/{id}/action` | Dismiss/hide/warn/suspend | mod | P0 | ✓ | TC-RPT-03 |
| RPT-04 | PUT/DELETE `/me/blocks/{user_id}` | Block/unblock | mem(1) | P1 | | TC-RPT-04 |
| ADM-01 | POST `/platform/colleges` | Create tenant | plat | P0 | ✓ | TC-ADM-01 |
| ADM-02 | PATCH `/platform/colleges/{id}` | Status/branding (suspend) | plat | P0 | | TC-ADM-02 |
| ADM-03 | GET/PATCH `/c/{slug}/admin/settings` | Tenant settings & flags | adm | P0 | | TC-ADM-03 |
| ADM-04 | POST `/c/{slug}/admin/roster/preview` + `/commit` | Roster import | adm | P1 | ✓ | TC-ADM-04 |
| ADM-05 | POST/GET/DELETE `/c/{slug}/admin/invites` | Invite codes | adm | P0 | ✓ | TC-ADM-05 |
| ADM-06 | GET `/c/{slug}/admin/verification-requests` | Queue | adm | P0 | | TC-ADM-06 |
| ADM-07 | POST `/c/{slug}/admin/verification-requests/{id}/decision` | Approve/reject | adm | P0 | ✓ | TC-ADM-07 |
| ADM-08 | GET `/c/{slug}/admin/members` | List members | adm | P0 | | TC-ADM-08 |
| ADM-09 | PATCH `/c/{slug}/admin/members/{membership_id}` | Role/suspend/remove | adm | P0 | | TC-ADM-09 |
| ADM-10 | GET `/c/{slug}/admin/audit-logs` | Audit | adm | P0 | | TC-ADM-10 |
| ADM-11 | GET `/c/{slug}/admin/stats` | Aggregate counts | adm | P1 | | TC-ADM-11 |
| ADM-12 | POST `/c/{slug}/admin/export` | Tenant data export | adm | P1 | ✓ | TC-ADM-12 |
| SYS-01 | GET `/api/health` / `/api/ready` | Liveness / readiness | pub | P0 | | TC-SYS-01 |
| WL-01 | POST `/waitlist` | Landing waitlist | pub | P1 | ✓ | TC-WL-01 |
| EVT-*, LNF-*, MKP-*, NTE-*, ACT-*, SKX-*, CAR-*, REP-*, NET-* | reserved | Tier 2/3 modules | | P2/P3 | | defined when scheduled |

Every operation has: **side effects** - notifications (TMF-08, ADM-07, RPT-03), audit rows (all `adm`/`mod`/`plat` mutations), analytics events (doc 06 §11). **DB effects** are in doc 13 and the service layer docs per task.

## 4. Detailed contracts (P0 representative set; the same template applies to all operations)
### AUTH-01 `POST /api/v1/auth/otp/request`
- **Request:** `{ "email": "a@acme.edu", "college_slug": "acme" }` - `email` valid, ≤254, lower-cased; `college_slug` optional.
- **200:** `{ "data": { "sent": true, "retry_after_seconds": 60 } }` - **always** returns this shape whether or not the address exists (no account enumeration).
- **Errors:** 400 `VALIDATION_FAILED`; 429 `RATE_LIMITED`; 503 `UPSTREAM_UNAVAILABLE` (email provider down).
- **Effects:** Auth OTP issued (expiry 10 min); hashed attempt counter; log (email hashed).
### AUTH-02 `POST /api/v1/auth/otp/verify`
- **Request:** `{ "email": "...", "code": "123456" }` code = 6 digits.
- **200:** `{ "data": { "user": { "id": "…", "email": "…" }, "is_new": true } }` + Set-Cookie.
- **Errors:** 400 `OTP_INVALID` (attempts counted; lock after 5), 410 `OTP_EXPIRED`, 429.
### TEN-03 `POST /api/v1/c/{slug}/join/invite` (IDEM)
- **Request:** `{ "code": "ACME-7K3Q-9XPD" }` (≤32, uppercase normalised).
- **200:** `{ "data": { "membership": { "id": "…", "status": "active", "verification_level": 2, "verification_method": "invite_code" } } }`
- **Errors:** 400 `INVITE_INVALID`; 410 `INVITE_EXPIRED`; 409 `INVITE_EXHAUSTED`; 409 `CONFLICT` if already member; 403 `TENANT_SUSPENDED`; 429 (brute-force: 10/h/user).
- **DB:** atomic update of `invite_codes.used_count`; insert/update `memberships`; audit row.
### TMF-01 `POST /api/v1/c/{slug}/team-posts` (IDEM)
```json
{
  "kind": "hackathon",
  "title": "Smart-campus hackathon team",
  "description": "Building an IoT attendance system...",
  "deadline": "2026-10-25T18:00:00Z",
  "external_link": "https://example.org/hackathon",
  "roles": [
    { "role_name": "Backend developer", "slots": 1, "skill_ids": ["…uuid…"] },
    { "role_name": "UI designer", "slots": 1, "skill_ids": [] }
  ]
}
```
- **Validation:** title 5–120; description ≤ 3000; 1–8 roles; slots 1–20; deadline future ≤ 180 days; links https; skills must exist.
- **201:** `{ "data": { "id": "…", "status": "open", "roles": [ { "id": "…", "role_name": "…", "slots": 1, "filled": 0 } ] } }`
- **Errors:** 400; 403 `VERIFICATION_LEVEL_TOO_LOW`; 429.
- **DB:** one transaction inserting `team_posts`, `team_post_roles`, `team_post_role_skills`.
### TMF-08 `POST /api/v1/c/{slug}/join-requests/{id}/decision` (IDEM)
- **Request:** `{ "decision": "accepted", "note": "Welcome!" }`
- **200:** `{ "data": { "request": { "id": "…", "status": "accepted" }, "role": { "id": "…", "slots": 1, "filled": 1 } } }`
- **Errors:** 403 not owner; 404 not visible; 409 `SLOTS_FULL`; 409 `CONFLICT` already decided.
- **Atomicity:** SQL function (doc 13 §9). **Effects:** notification to applicant; closes post to `filled` when all roles full.
### APP-03 `PATCH /api/v1/me/applications/{id}`
- **Headers:** `If-Match: 3`; **Body:** partial fields; **200** returns new `version: 4`; **409 `VERSION_CONFLICT`** if stale.
### ADM-07 `POST …/verification-requests/{id}/decision`
- **Request:** `{ "decision": "rejected", "reason": "Enrollment number not found" }` - `reason` required for rejection (≥ 5 chars).
- **Effects:** membership status/level update; notification; audit row; **cannot approve own request (403)**.

## 5. Testing endpoints independently of the frontend
1. Start local stack (`supabase start`, `pnpm dev`).
2. Get a test token: `pnpm test:token --user alice@alpha.test` (script signs in the seeded user; never used outside local/CI).
3. Call with curl/HTTP client, e.g. `curl -H "Authorization: Bearer $TOKEN" localhost:3000/api/v1/c/alpha/team-posts`.
4. Contract tests (Vitest + generated OpenAPI) assert: status, envelope shape, required fields, error codes.
5. A shared collection (Bruno/Postman export) lives in `docs/api-collection/` (T-BE-02).
6. Mock server for frontend work: contract fixtures in `src/contracts/fixtures/*.json`, served by MSW until the real endpoint is ready (doc 26 §5).

## 6. Contracts in code (R2 Day 1)
From Day 1 the Zod schemas in `src/contracts` are the source of truth for the operations of Days 2 to 4. Import them with `import { ... } from "@/contracts"`. Sample data is in `src/contracts/fixtures/*.json`, named `<operation>.<kind>.json` where kind is `request`, `query`, `success` or `error-<code>`. A Vitest test checks that every fixture passes its schema and that every error code has a sample.

| Area | Operations | File |
|---|---|---|
| Shared (envelopes, error codes, HTTP status, pagination) | all | `common.ts` |
| Auth | AUTH-01 to AUTH-04 | `auth.ts` |
| Join and membership | TEN-01 to TEN-05, TEN-07 | `tenant.ts` |
| Admin | ADM-03, ADM-05 to ADM-10 | `admin.ts` |
| Profile and skills | PRF-01 to PRF-03 | `profile.ts` |
| Notifications, announcements, reports, waitlist | NTF-01/02, ANN-01/02, RPT-01 to RPT-03, WL-01 | `engagement.ts` |

Choices R2 made where this document was silent (change them in a contract PR, tag R3 and R4):
- `GET /c/{slug}/me/membership` returns `200` with `{ "membership": null }` when the user has not joined, not a 404.
- `TEN-05` (email domain) is one endpoint with a `step` field: `start` sends the code, `complete` checks it.
- A client may never send `role`, `status` or `verification_level`. Bodies are strict, so unknown keys give `VALIDATION_FAILED`.
- `ADM-07`: `rejected` needs `reason` (5 to 500 characters). `ADM-09`: `suspended` or `left` needs `reason`. `RPT-03`: every action except `dismiss` needs `note`.
- Audit log ids are strings because they are 64 bit numbers.
- `AUTH-04`, `NTF-01/02`, `ANN-01/02`, `RPT-*` and `WL-01` response shapes are proposals. The tables behind them arrive on Days 3 and 4. R2 confirms or changes them when each endpoint is built.
- Notification types for now: `membership.approved`, `membership.rejected`, `announcement.published`, `report.actioned`.

## 7. Built in R2 Day 2 (what is real now)
| Operation | Path | Notes |
|---|---|---|
| AUTH-01 | POST `/api/v1/auth/otp/request` | Same answer for any email. 5 per hour per email, 20 per hour per IP |
| AUTH-02 | POST `/api/v1/auth/otp/verify` | Sets HttpOnly cookies. The body never holds tokens. Lock after 5 wrong codes (15 minutes). 10 attempts per 15 minutes |
| AUTH-03 | POST `/api/v1/auth/logout` | `?all=true` signs out everywhere. A cookie request needs a matching `Origin` |
| TEN-01 | GET `/api/v1/colleges/public/{slug}` | No login. Active colleges only. `logo_url` is always null for now |
| TEN-02 | GET `/api/v1/c/{slug}/me/membership` | `membership` is null if the user has not joined |
| TEN-03 | POST `/api/v1/c/{slug}/join/invite` | IDEM. 10 tries per hour per person |
| TEN-04 | POST `/api/v1/c/{slug}/join/manual` | IDEM. Pending until an admin decides |
| TEN-05 | POST `/api/v1/c/{slug}/join/email-domain` | Body has `step`: `start` or `complete`. Active at level 2 on success |

Rules the screens (R3) must follow:
- Cookie session: call the API with `credentials: "include"`. The browser never sees the tokens. State changing calls from the browser carry the normal `Origin` header.
- Tools and tests can send `Authorization: Bearer <access token>` instead.
- IDEM endpoints (TEN-03, TEN-04, TEN-09) need an `Idempotency-Key` header with a new UUID for each new request. Send the same UUID when you retry the same request. A replay answers with the header `Idempotent-Replay: true`. The same key with another body gives 422 `IDEMPOTENCY_KEY_REUSED`.
- Every answer has the header `X-Request-Id`. Show it when something goes wrong (`INTERNAL`).
- 429 answers carry `Retry-After` (seconds) and `error.details.retry_after_seconds`.
- A person who is `pending` can call join endpoints and TEN-02. Every other member endpoint answers 403 `MEMBERSHIP_NOT_ACTIVE`.
- Someone who is not a member of a college gets 404 `NOT_FOUND` on its member endpoints.
- A wrong or old code: `OTP_INVALID` (400) or `OTP_EXPIRED` (410). A person who is suspended or rejected cannot rejoin alone (403 `FORBIDDEN`).

Choices R2 made on Day 2:
- `OTP_EXPIRED` is answered when no code was sent to that address in the last 10 minutes. Supabase gives one error for both a wrong and an old code.
- A college whose settings do not allow invite codes answers `INVITE_INVALID`, so it does not reveal itself. Manual and email-domain answer 403 `FORBIDDEN` when switched off.
- An address that is not on a verified domain of the college gives 400 `VALIDATION_FAILED` with `details.fields[0].path = "email"`.
- Dates are UTC with a `Z`.
- The integration tests run against the local stack only: `pnpm test:integration`.

## 8. Admin endpoints built in R2 Day 3 (what is real now)
All paths start with `/api/v1/c/{slug}/admin`. They are for **college admins only**. Sample data for every one of them is in `src/contracts/fixtures` (`adm-*.json`), the shapes are in `src/contracts/admin.ts`.

| Operation | Method and path | Notes |
|---|---|---|
| ADM-03 | GET `/settings` | Join methods, approval rule, level to post, module flags, and a read only `college` block (name, colours, domains) |
| ADM-03 | PATCH `/settings` | Send only what changes. Audit: `settings.updated`. `network_visibility` can only be `private` in v1 |
| ADM-11 | GET `/stats` | `total_members`, `pending_verifications`, `active_invites` for the dashboard |
| ADM-05 | GET `/invites` | The 100 newest invites, each with `status`: `active`, `exhausted`, `expired`, `revoked` |
| ADM-05 | POST `/invites` | IDEM. Body: `label`, `max_uses` (1 to 1000), `expires_at` (future, at most 365 days), `grants_status` (`active` = joins as member at level 2, `pending` = waits in the queue). Answer 201 with the plain `code` **once**. Audit: `invite.created` |
| ADM-05 | DELETE `/invites/{id}` | Revoke. 404 unknown, 409 already revoked. Audit: `invite.revoked` |
| ADM-06 | GET `/verification-requests?status=pending&limit=20&cursor=` | The queue. Applicant name and email, program, year, last 4 of the enrolment number |
| ADM-07 | POST `/verification-requests/{id}/decision` | IDEM. `{ "decision": "approved" }` or `{ "decision": "rejected", "reason": "5 or more characters" }`. Audit: `member.approved` or `member.rejected` |
| ADM-08 | GET `/members?q=&status=&role=&limit=&cursor=` | Everyone who joined, newest first. **No email addresses** |
| ADM-09 | PATCH `/members/{membershipId}` | `role` and/or `status` (`active`, `suspended`, `left`). `reason` (5 or more characters) is required for `suspended` and `left`. Audit: `member.role_changed`, `member.suspended`, `member.reinstated` or `member.removed` |
| ADM-10 | GET `/audit-logs?action=&actor_id=&limit=&cursor=` | Read only. Each row has `actor_name` |

Who gets through (checked on every call, in this order): not signed in = 401 `UNAUTHENTICATED`; pending or suspended member = 403 `MEMBERSHIP_NOT_ACTIVE`; student or moderator = 403 `FORBIDDEN`; a person who is not a member of that college (even an admin of another college) = 404 `NOT_FOUND`; suspended college = 403 `TENANT_SUSPENDED`. Hiding a button is not security: the server decides.

Rules for the screens (R4, R3):
- **Lists** answer `{ data: [...], meta: { request_id, next_cursor } }`. Send `next_cursor` back as `?cursor=` to get the next page. `next_cursor` is `null` on the last page. `limit` is 1 to 50 (default 20). Unknown query parameters give 400.
- **IDEM endpoints** (create invite, decision) need an `Idempotency-Key` header with a new UUID for each new action. Reuse the same UUID only when retrying the same action. The create answer holds the plain invite code once. A retry with the same key returns the invite with `code: null`: the screen must then say "This code was already shown. Revoke it and create a new one."
- **Reject needs a reason** (5 or more characters). **Suspend and remove need a reason.** Show the reason box before the call, the server refuses without it.
- **Errors to design for**: 409 `CONFLICT` on a decision means the item was already decided (reload the queue). 409 on a member change also means "a college must keep at least one active admin" (read `error.message`). 403 `FORBIDDEN` when an admin changes their own role or status, or decides their own request.
- **Every change writes exactly one audit row.** Refused calls write none.
- **Dates** are UTC with a `Z`. `audit.id` is a string.
- Call with `credentials: "include"` (cookie session). State changing calls from the browser carry the normal `Origin` header.
- Rate limit: 120 admin calls per minute per person, then 429 `RATE_LIMITED` with `Retry-After`.

Not built yet (so keep sample data for these): notifications to the applicant after a decision (Day 4), the roster import (ADM-04), the data export (ADM-12), moderator tools.

## 9. Built in R2 Day 4 (what is real now)

Base `/api/v1`. All changes need a matching `Origin`. Writes are limited to 60 a minute per person (429 `RATE_LIMITED` with `Retry-After`). `IDEM` = send an `Idempotency-Key`.

| ID | Call | What it does |
|---|---|---|
| NTF-01 | GET `/me/notifications?unread=true&limit=20&cursor=` | Your own notifications, newest first. `meta.unread_count` counts all unread, not only this page |
| NTF-02 | POST `/me/notifications/read` | Body `{ "ids": [..] }` or `{ "all": true }`. Answer `{ "updated": n }`. Other people's ids change nothing |
| ANN-01 | GET `/c/{slug}/announcements?limit=&cursor=` | Members. Pinned first, then newest. Only current, published, not hidden ones |
| ANN-02 | GET `/c/{slug}/admin/announcements` | Moderators and admins. All statuses, hidden ones too |
| ANN-02 | POST `/c/{slug}/admin/announcements` | IDEM. `title`, `body`, `pinned`, optional `publish_at`, `expires_at` (future). Published now = every active member except you gets a notification. Audit `announcement.created` |
| ANN-02 | PATCH `/c/{slug}/admin/announcements/{id}` | Send only what changes (`title`, `body`, `pinned`, `status`, `publish_at`, `expires_at`). 409 if removed. Audit `announcement.updated` |
| ANN-02 | DELETE `/c/{slug}/admin/announcements/{id}` | Sets `status` to `removed`. Audit `announcement.removed` |
| RPT-01 | POST `/c/{slug}/reports` | IDEM. `target_type` (`announcement` or `profile` for now), `target_id`, `reason`, optional `details`. 409 if you already have an open report on it, 400 for yourself, 404 for another college |
| RPT-02 | GET `/c/{slug}/admin/reports?status=open&limit=&cursor=` | Moderators and admins. Each item has `target_title`, `reporter`, `status` |
| RPT-03 | POST `/c/{slug}/admin/reports/{id}/action` | IDEM. `action`: `dismiss`, `hide`, `warn`, `suspend`. `note` of 5 or more characters is needed except for dismiss. 409 if already handled. 403 if the report is about you, or you may not suspend that role (a moderator suspends students only, nobody suspends an admin here) |
| RPT-04 | PUT / DELETE `/me/blocks/{userId}` | Block or unblock a classmate. Safe to repeat. 400 for yourself, 404 for someone not in a college you share |
| WL-01 | POST `/waitlist` | Public. `college_name`, `contact_name`, `contact_email`, `role`, `consent: true`, optional `source`. Always answers `{ "joined": true }`, even for an email already there. 5 a hour per IP |

Notification types and `payload` (always has `title` and `message`):

| `type` | When | Extra payload |
|---|---|---|
| `membership.approved` / `membership.rejected` | An admin decided your join request (the reason is in `message`) | `college_slug` |
| `announcement.published` | A new announcement | `announcement_id`, `college_slug` |
| `report.actioned` | A moderator handled your report | `report_id` |
| `moderation.warned` / `moderation.hidden` | A moderator warned you or hid your content (the note is in `message`) | `report_id` |

For R4 and R3 (mapping from the sample screens): `verification_decision` is `membership.approved` or `membership.rejected`, `report_outcome` is `report.actioned`, notification `title` and `body` are `payload.title` and `payload.message`. Announcement `author` and report `reporter` have `user_id` (can be null after an account is deleted) and `display_name`. Fixtures: `src/contracts/fixtures/ntf-*`, `ann-*`, `rpt-*`, `wl-*`.

Who may call each endpoint: docs/PERMISSIONS.md.

## 10. Team Finder, built in R2 Day 5 (what is real now)

Base `/api/v1/c/{slug}`. All calls need an active member (pending and suspended get 403, another college gets 404). Changes need a matching `Origin` and are limited to 60 a minute. `IDEM` = send an `Idempotency-Key`. Shapes: `src/contracts/teamfinder.ts`, samples: `src/contracts/fixtures/tmf-*`.

| ID | Call | What it does |
|---|---|---|
| TMF-01 | POST `/team-posts` | IDEM. `kind`, `title` (5 to 120), `description` (up to 3000), optional `deadline` (future, up to 180 days), `external_link` and `team_link` (https), `roles` (1 to 8: `role_name`, `slots` 1 to 20, `skill_ids`). 201 with the post. 403 `VERIFICATION_LEVEL_TOO_LOW` if the college asks for more. 429 at 10 open posts |
| TMF-02 | GET `/team-posts?kind=&status=open&skill=&q=&mine=true&limit=&cursor=` | Newest first. `status`: `open` (default), `closed`, `filled`, `expired`, `all`. `skill` is a skill id. `q` searches title and description. `mine=true` is my own posts ("My posts") |
| TMF-03 | GET `/team-posts/{id}` | One post. `team_link` is null unless you are the author or an accepted member. `pending_requests` only for the author |
| TMF-04 | PATCH `/team-posts/{id}` | Author only, open posts only. Send only what changes, `null` clears a link or the deadline. Roles cannot be edited |
| TMF-05 | POST `/team-posts/{id}/close` | Author only. Waiting requests are cancelled and their people told. 409 if not open |
| TMF-06 | POST `/team-posts/{id}/roles/{roleId}/requests` | IDEM. `{ "message": "up to 500" }`. 409 `ALREADY_REQUESTED`, 409 `SLOTS_FULL`, 409 `CONFLICT` (not open or past its deadline), 403 your own post, 404 hidden or blocked, 429 at 10 waiting requests. The author gets a notification |
| TMF-07 | GET `/team-posts/{id}/requests?status=pending` | Author only (403 for others). Applicant name, headline and skills, never an email |
| TMF-08 | POST `/join-requests/{id}/decision` | IDEM. `{ "decision": "accepted" or "declined", "note": "optional" }`. Author only. 409 `SLOTS_FULL`, 409 `CONFLICT` if already decided. Answer `{ request, role: { slots, filled } }`. When all roles are full the post becomes `filled` and the rest are cancelled. The applicant is told |
| TMF-09 | DELETE `/join-requests/{id}` | Applicant only (404 for others). Pending or accepted. After an acceptance the slot is free again and the author is told. 409 if already withdrawn, declined or cancelled |
| TMF-10 | GET `/me/join-requests?status=&limit=&cursor=` | New. My own requests with the post title, kind, status and the role. For the "My requests" screen |

Rules for the screens:

- A post has `status` open, closed, filled or expired. `expired` is worked out from the deadline, so it is right even before any clean up.
- Each post carries `my_requests` (my request id, role id and status), so a screen can show Request, Requested or Accepted without another call.
- A role chip is full when `filled >= slots`. A 409 `SLOTS_FULL` means somebody else was faster: reload the post.
- Roles have `skills` (names, for chips) and `skill_ids` (for filters).
- Notification types: `team.request_received` (to the author), `team.request_accepted`, `team.request_declined`, `team.request_cancelled` (post closed or full), `team.request_withdrawn` (to the author). `payload` has `title`, `message`, `post_id`, and `request_id` or `role_id`.
- Reports: `target_type: "team_post"` works in RPT-01. A moderator `hide` removes the post from every list. The author still sees it.
- Posts of people you blocked (or who blocked you) and of people who left the college never appear.

## 11. Built in R2 Day 6 (what changed)

- **Safe retries (all IDEM endpoints).** The `Idempotency-Key` is claimed before the work starts. Same key and same body: the first answer again with `Idempotent-Replay: true`. Same key, different body: 422 `IDEMPOTENCY_KEY_REUSED`. Same key while the first call is still running: 409 `CONFLICT` with `Retry-After: 1`, wait and send the same call again. A call that fails does not keep the key. Keys live 24 hours.
- **TEN-01** also returns `modules: { campus, collaborate, career }` (true unless the college admin switched the tab off). Use it to hide a tab before sign in.
- **SYS-02** `POST /api/internal/maintenance` is for the scheduler only (`Authorization: Bearer <CRON_SECRET>`, 401 for everyone else). Screens never call it.
- **Expiry rules.** An open team post past its deadline is shown as `expired` immediately; the maintenance run then closes it, cancels the waiting requests and tells the author and the applicants (`team.post_expired`, `team.request_cancelled`). A join request that waited more than 30 days for an admin becomes `expired`, the membership goes to `left`, the person gets `membership.expired` and can apply again.
- New notification types: `membership.expired`, `team.post_expired`.
- Rules for R3: see docs/CONNECTING_THE_API.md.

## 12. Opportunities and reminders, built in R2 Day 7 (what is real now)

Base `/api/v1`. Shapes: `src/contracts/opportunities.ts`, samples: `src/contracts/fixtures/opp-*` and `rem-01`, mock answers: `src/mocks/handlers-day7.ts`. Changes need a matching `Origin` and are limited to 60 a minute. IDEM = send an `Idempotency-Key`.

| ID | Call | What it does |
|---|---|---|
| OPP-01 | GET `/c/{slug}/opportunities?kind=job,internship&skills=React,SQL&mode=remote&location=hyd&deadline=7d&q=acme&saved=true&limit=&cursor=` | Members. Newest first. `kind` and `skills` take comma lists (skills match any, ignoring case). `deadline`: `any` (default), `7d`, `30d` (closing within), `hide_closed`. `saved=true` is "my saved". Drafts and removed listings never appear |
| OPP-02 | GET `/c/{slug}/opportunities/{id}` | One listing. 404 for a draft, a removed one or another college |
| OPP-03 | GET `/c/{slug}/admin/opportunities?status=draft` | Moderators and admins. Every listing, drafts and removed included. `raw_status` is the stored status |
| OPP-03 | POST `/c/{slug}/admin/opportunities` | IDEM. `title`, `org`, `kind`, `location`, `mode`, `stipend_min`, `stipend_max` (paise a month), `eligibility`, `skills` (up to 10), `deadline`, `apply_url` (https), `status` (`draft` or `published`). 201. Audit `opportunity.created` |
| OPP-03 | PATCH `/c/{slug}/admin/opportunities/{id}` | Send only what changes. `verified: true` moves `last_verified_at` to now. 409 if removed. Audit `opportunity.updated` |
| OPP-03 | DELETE `/c/{slug}/admin/opportunities/{id}` | Sets status `removed`. 409 if already removed. Audit `opportunity.removed` |
| OPP-04 | PUT or DELETE `/me/saved-opportunities/{id}` | Save or unsave. Safe to repeat. 404 for a draft, an unknown id or a college you are not an active member of |
| REM-01 | GET or PUT `/me/reminder-settings` | `{ "enabled": true }`, on by default. When on, a saved listing closing within 48 hours sends one notification |

Rules for the screens:

- Each listing has `saved` (for me) and `changed_since_saved` (edited after I saved it: show a "changed" badge).
- `status` can be `expired` even before any clean up runs. `last_verified_at` and `posted_by` (a display name) are always shown.
- `location` can be an empty string. `stipend_min` and `stipend_max` can be null.
- The Career tab: when a college switched it off (`modules.career` false in TEN-01), every call here answers 404 `FEATURE_DISABLED`.
- Notification type `opportunity.deadline_soon` has `payload.opportunity_id`.
- `in_tracker` (already added to the tracker) is not part of this API: the tracker is R3's (APP-01 to APP-04).

## 13. Changes from R2 Day 8 (hardening)

- **Reads are limited** to 300 a minute per person (429 `RATE_LIMITED`, read `Retry-After`). Changes stay at 60 a minute.
- **Tabs switched off:** when a college sets a tab off (`modules.campus`, `modules.collaborate` or `modules.career` in TEN-01 is false), its calls answer 404 `FEATURE_DISABLED`: announcements (campus), Team Finder (collaborate), opportunities (career).
- **Sign in** calls (AUTH-01, AUTH-02) now check the Origin like every other change: a call from another website is 403.
- **Request size:** a body over its limit is 413 `PAYLOAD_TOO_LARGE` as soon as the limit is passed, also without a Content-Length. JSON is 100 KB, an avatar is 2 MB.
- **Avatars (PRF-04):** JPEG, PNG, WebP, GIF or AVIF only (no SVG), 2 MB, stored under `<user id>/`. If the upload fails the answer is 503 and the profile is not changed. Use `POST /me/avatar` to attach an avatar; the signed upload link (`/me/avatar/upload-url`) only stores the file, and the storage rules refuse other types and sizes.
- **Skills (PRF-02):** replaced in one step. An unknown skill id is 400 and the old list stays.

## 14. Built in R2 Day 9 (what is real now)

| ID | Call | What it does |
|---|---|---|
| AUTH-04 | DELETE `/me` | Delete my account for good, in two steps with the same call. Send `{}`: a 6 digit code is emailed to my address and the answer is `{ "deletion_requested": true, "confirmation": "otp" }`. Send `{ "code": "123456" }`: the code is checked, every session ends, my profile, memberships, posts, requests, notifications, skills and saved items are deleted, and the answer is `{ "deleted": true }`. 409 `CONFLICT` if I am the only admin of a college (the message names it). 400 `OTP_INVALID`, 410 `OTP_EXPIRED`. The audit log keeps my user id (an anonymous number) and no name or email |
| AUTH-05 | GET `/auth/google?next=/path` | Starts Continue with Google. Answers 302 to Google and sets a short lived cookie that holds the one time proof (PKCE). `next` must be a path inside the app. If Google sign in is not switched on in the project, answers 302 to `/signin?error=google_unavailable`. Not a JSON endpoint: open it with a normal link or `window.location`, not `fetch` |
| AUTH-06 | GET `/auth/google/callback?code=...&next=/path` | Where Google sends the person back. Exchanges the code for a session (cookies) and answers 302 to `next` (or `/`). A cancelled or failed sign in answers 302 to `/signin?error=google_cancelled` or `google_failed`. Not a JSON endpoint |
| TEN-07 | POST `/c/{slug}/me/leave` | Leave this college. Answer `{ "membership": { "id", "status": "left" } }`. Active members and people waiting for approval only: 403 for a suspended or rejected person, 404 if I never joined, 409 if I already left or if I am the last admin. Closes my open team posts, withdraws my requests, gives back my team seats. I can join again later |
| PRF-06 | GET `/c/{slug}/people/{userId}` | One classmate: `display_name`, `handle`, `headline`, `bio`, `avatar_url`, `interests`, `career_goal`, `program`, `grad_year`, `skills[{name, level}]`, `is_self`. 404 if hidden (by the person or a moderator), blocked either way, left, in another college or unknown. Never an email address |

## 15. Added with the frontend takeover (R3 Days 1 to 3 upgrade)

| ID | Call | What it does |
|---|---|---|
| TEN-08 | GET `/me/memberships` | Every college I belong to or asked to join, newest first, each as `{ college: { slug, name, short_name, city, accent_hex }, membership: { id, role, status, verification_level } }`. Any signed-in person, own rows only. Used right after sign in: no college sends the person to the college list, one college goes straight in, several show a chooser |
| TEN-09 | POST `/c/{slug}/join/open` | IDEM. Only the Global college (`slug` `global`) allows it; every other college answers 403 FORBIDDEN. The person is active at once with `verification_level` 1 and `verification_method` "open" (signed in, not verified by any college). 10 tries per hour per person. Body is `{}` |

