> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 14 - API Contracts

| Field | Value |
|---|---|
| Doc ID | DOC-14 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 Tech Lead (contract owner). Change process: doc 26 §6 |
| Status | Proposed. Machine-readable skeleton: `openapi.v1.yaml` (this folder). The Zod schemas in `src/contracts` become the source of truth once code exists; OpenAPI is generated from them. |

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
| TEN-01 | GET `/colleges/public/{slug}` | Public branding + enabled methods | pub | P0 | | TC-TEN-01 |
| TEN-02 | GET `/c/{slug}/me/membership` | My status, level, method | ses | P0 | | TC-VER-01 |
| TEN-03 | POST `/c/{slug}/join/invite` | Redeem invite code | ses | P0 | ✓ | TC-VER-02..05 |
| TEN-04 | POST `/c/{slug}/join/manual` | Submit manual verification | ses | P0 | ✓ | TC-VER-06..08 |
| TEN-05 | POST `/c/{slug}/join/email-domain` | Start/complete domain verification | ses | P0 | | TC-VER-09..12 |
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
- IDEM endpoints (TEN-03, TEN-04) need an `Idempotency-Key` header with a new UUID for each new request. Send the same UUID when you retry the same request. A replay answers with the header `Idempotent-Replay: true`. The same key with another body gives 422 `IDEMPOTENCY_KEY_REUSED`.
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
