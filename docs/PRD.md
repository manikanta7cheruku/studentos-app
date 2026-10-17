> Note: this file came from the first planning package. The task list is in ROADMAP.md.

# 06 - Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Doc ID | DOC-06 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R1 Product Owner |
| Status | Proposed |
| Conventions | `FR-<MODULE>-NNN` functional · `NFR-NNN` non-functional · `BR-NNN` business rule · `AC` acceptance criteria (Given/When/Then) · priority `P0`(release-blocking) / `P1` / `P2` / `P3` matching tiers in doc 05 |
| Modules | TEN tenancy · AUT auth · VER verification · ADM admin · PRF profile · PRJ projects · TMF Team Finder · APP tracker · OPP opportunities · ANN announcements · EVT events · LNF lost & found · MKP marketplace · NTE notes · ACT activities · SKX skill exchange · RPT reports/moderation · NTF notifications · CAR career tools · REP reputation |

## 1. Problem statement
Students at a college have campus life, collaboration, and career preparation scattered across unstructured chats and many apps; colleges lack a controlled, official channel. StudentOS provides one tenant-isolated platform per college. *(Problem severity is UNVALIDATED; see doc 03.)*

## 2. Goals and measurable outcomes (targets are proposals)
| Goal | Metric | Target for pilot (hypothesis) |
|---|---|---|
| G1 Verified membership | % of invited students completing verification | ≥ 60% |
| G2 Activation | % verified students who complete profile + 1 action (post/request/track) in 7 days | ≥ 40% |
| G3 Collaboration | Team posts that receive ≥ 1 request within 72 h | ≥ 50% |
| G4 Career value | Final-years adding ≥ 5 tracked applications | ≥ 30% of final-years |
| G5 Retention | Weekly active / verified | ≥ 25% at week 4 |
| G6 Safety | Reports handled within 24 h | ≥ 90% |
| G7 Trust | Zero cross-tenant data exposures | 0 |
Targets are for decision-making, not predictions.

## 3. Users and personas
See `../00_START_HERE/PRODUCT_DESCRIPTION_AND_USE_CASES.md` §2 (P-01..P-08).

## 4. Roles
`student`, `moderator`, `college_admin` (per-tenant, in `memberships.role`); `platform_admin` (global, separate table); `anon` (public landing/portfolio only). Permission matrix: doc 15.

## 5. Functional requirements

### 5.1 Tenancy (TEN) - P0
| ID | Requirement | Pri |
|---|---|---|
| FR-TEN-001 | A platform admin can create a college (tenant) with name, unique slug, timezone, and first admin invite. | P0 |
| FR-TEN-002 | Every tenant-scoped record belongs to exactly one `college_id`; the DB prevents reading or writing another tenant's rows. | P0 |
| FR-TEN-003 | A tenant has settings: branding (logo, accent color from an allowed palette), allowed verification methods, module flags, `network_visibility` (default `private`). | P0 |
| FR-TEN-004 | A tenant starts with no users, posts, or content other than defaults. | P0 |
| FR-TEN-005 | A tenant can be suspended; members then see a clear notice, no data is deleted. | P1 |
| FR-TEN-006 | A tenant admin can export tenant data and request tenant deletion. | P1 |
| FR-TEN-007 | Custom domain/subdomain per tenant. | P3 |

### 5.2 Authentication (AUT) - P0
| ID | Requirement | Pri |
|---|---|---|
| FR-AUT-001 | A person can sign in with an email one-time code or magic link; no password in v1. | P0 |
| FR-AUT-002 | Phone OTP is optional and only an anti-abuse signal; never proof of student status. | P1 |
| FR-AUT-003 | Sessions expire; user can sign out of this/all devices. | P0 |
| FR-AUT-004 | Rate limits and lockouts on OTP request/verify. | P0 |
| FR-AUT-005 | Account deletion request with confirmation; data handled per doc 13 lifecycle. | P0 |
| FR-AUT-006 | Social/Google sign-in. | P3 |

### 5.3 Verification and membership (VER) - P0
| ID | Requirement | Pri |
|---|---|---|
| FR-VER-001 | A signed-in user can request to join a tenant; membership starts `pending`, level 0. | P0 |
| FR-VER-002 | If the tenant allows email-domain verification and the user proves control of an address on a registered domain, membership becomes `active`, level 2 automatically. | P0 |
| FR-VER-003 | If the tenant allows invite codes, a valid, unexpired, unused-up code grants membership (to `pending` or `active` per code setting). | P0 |
| FR-VER-004 | If the tenant allows manual approval, the user submits enrollment number, program, year; admins approve or reject with a reason. | P0 |
| FR-VER-005 | If the tenant uploaded a roster, a user whose email/enrollment matches an unclaimed row can claim it; each row claimable once. | P1 |
| FR-VER-006 | Pending members can only see the join status page and public tenant info. | P0 |
| FR-VER-007 | Verification method and level are stored and displayed; they can be revoked by admins. | P0 |
| FR-VER-008 | Student-ID upload, SSO/ERP, DigiLocker/APAAR-type integrations, peer vouching: designed but off. | P3 |

### 5.4 Admin (ADM) - P0/P1
| ID | Requirement | Pri |
|---|---|---|
| FR-ADM-001 | College admins manage invite codes (create, limit, expire, revoke). | P0 |
| FR-ADM-002 | College admins see and decide verification requests. | P0 |
| FR-ADM-003 | College admins list members; change role; suspend; remove. | P0 |
| FR-ADM-004 | Roster CSV import with preview, row-level errors, idempotent re-import. | P1 |
| FR-ADM-005 | Every admin/moderator action creates an immutable audit log entry. | P0 |
| FR-ADM-006 | Admins toggle module flags for their tenant within platform-allowed modules. | P0 |
| FR-ADM-007 | Aggregate usage dashboard (counts only; no individual tracking). | P1 |

### 5.5 Profile and portfolio (PRF, PRJ)
| ID | Requirement | Pri |
|---|---|---|
| FR-PRF-001 | Student edits display name, headline, bio, avatar, interests, goals. | P0 |
| FR-PRF-002 | Student manages skills with level and optional evidence link; skills stored once (catalog + user_skills). | P0 |
| FR-PRF-003 | Student manages achievements/certifications. | P1 |
| FR-PRF-004 | Student sets profile visibility: `college` (default) or `hidden`; public portfolio link is opt-in. | P0 |
| FR-PRF-005 | Verified members can search the college directory by name/skill; hidden profiles excluded. | P1 |
| FR-PRJ-001 | Student creates/edits/deletes projects with summary, links, role, dates, visibility. | P1 |
| FR-PRJ-002 | A project can list other members (they must confirm). | P1 |
| FR-PRJ-003 | Public portfolio page lists chosen projects; no private data leaks. | P1 |
| FR-PRF-006 | Contribution history shows confirmed team/project participation. | P1 |

### 5.6 Team Finder (TMF) - P1
| ID | Requirement | Pri |
|---|---|---|
| FR-TMF-001 | Verified member creates a post: type (project/startup/hackathon/competition), title, description, deadline, roles needed (name, slots, skills). | P1 |
| FR-TMF-002 | Verified members browse/filter by type, skill, status, keyword; paginated. | P1 |
| FR-TMF-003 | A member can request to join a role with a short message; one active request per post-role. | P1 |
| FR-TMF-004 | Post owner accepts/declines; accept increments filled slots atomically; over-filling is impossible. | P1 |
| FR-TMF-005 | Owner can edit/close; posts auto-expire after deadline. | P1 |
| FR-TMF-006 | Applicant can withdraw. | P1 |
| FR-TMF-007 | Accept/decline creates a notification to the applicant. | P1 |
| FR-TMF-008 | Accepted teams can convert to a project (PRJ). | P2 |

### 5.7 Application Tracker (APP) and Opportunities (OPP)
| ID | Requirement | Pri |
|---|---|---|
| FR-APP-001 | Student creates an application record (company, role, link, deadline, notes). | P1 |
| FR-APP-002 | Statuses: saved, applied, assessment, interview, offer, rejected, withdrawn; transitions timestamped. | P1 |
| FR-APP-003 | Student sees list/board, filter by status, sort by deadline. | P1 |
| FR-APP-004 | Applications are **private** to the student (never visible to admins/others). | P1 |
| FR-APP-005 | Deadline reminders in-app. | P2 |
| FR-OPP-001 | Admins/moderators post curated opportunities (type, org, skills, location, stipend range, eligibility, deadline, link). | P1 |
| FR-OPP-002 | Students filter and save; saving can create a tracker entry. | P1 |
| FR-OPP-003 | Expired listings are hidden by default. | P1 |
| FR-OPP-004 | No scraping or automated import in v1. | - |

### 5.8 Campus (ANN, EVT, LNF, MKP, NTE, ACT)
| ID | Requirement | Pri |
|---|---|---|
| FR-ANN-001 | Admins/moderators post announcements (title, body, pin, schedule, expiry). | P1 |
| FR-EVT-001 | Create events (title, time, place, description, capacity); RSVP/cancel; attendee count. | P2 |
| FR-LNF-001 | Post lost/found items with photo; claim flow; owner/finder close the item; contact is in-app only. | P2 |
| FR-MKP-001 | List items (sell/rent/free/wanted) with price **display only**, photos, condition; request flow; mark as closed; **no payment**. | P2 |
| FR-NTE-001 | Upload notes with subject/course/semester; copyright declaration; report/takedown. | P2 |
| FR-ACT-001 | Post activity (sport, time, venue, spots); join/leave. | P2 |

### 5.9 Safety (RPT), notifications (NTF)
| ID | Requirement | Pri |
|---|---|---|
| FR-RPT-001 | Any member can report content or a user with a reason. | P0 |
| FR-RPT-002 | Moderators/admins see a queue; actions: dismiss, hide, warn, suspend; all audited. | P0 |
| FR-RPT-003 | Members can block another member (hidden from each other's contact flows). | P1 |
| FR-NTF-001 | In-app notifications list with unread count; mark read. | P1 |
| FR-NTF-002 | Email notifications opt-in by event type. | P2 |

### 5.10 Later (P3, designed only)
FR-CAR-001 Roadmap; FR-CAR-002 Daily plan (3 tasks, reschedule); FR-CAR-003 Weekly review; FR-CAR-004 Resume builder; FR-CAR-005 Interview practice; FR-REP-001..003 three separate signals; FR-NET-001 cross-college read-only listings (both tenants opt-in); FR-ANO-001 anonymous community; FR-AI-001 AI assistance (needs cost/accuracy ADR).

## 6. Non-functional requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-001 | Tenant isolation enforced in DB (RLS) and tested negatively | pgTAP + API tests |
| NFR-002 | P95 API latency < 500 ms for list/read endpoints on staging with seed data (goal, UNV) | k6/smoke |
| NFR-003 | Page loads: LCP < 2.5 s on mid-range phone, 4G (goal) | Lighthouse |
| NFR-004 | WCAG 2.2 AA target on core flows | axe + manual |
| NFR-005 | Mobile-first responsive 360 px → desktop | Playwright viewports |
| NFR-006 | All inputs validated server-side; max sizes defined | contract tests |
| NFR-007 | No secrets in repo; secrets scanning in CI | CI |
| NFR-008 | Structured logs, error tracking, health endpoint | doc 22 |
| NFR-009 | Backups with a tested restore (S2+) | doc 23 |
| NFR-010 | Idempotent write endpoints where retries are plausible | tests |
| NFR-011 | Data minimisation, retention schedule | doc 13/19 |
| NFR-012 | Browser support: last 2 versions of Chrome, Edge, Firefox, Safari; Android Chrome, iOS Safari | e2e matrix |
| NFR-013 | Uploads: allowed MIME list, size limit (images ≤ 5 MB, docs ≤ 15 MB proposed), server-side check | tests |
| NFR-014 | English first; text externalised for later localisation (Hindi/Telugu etc.) | review |

## 7. Business rules
| ID | Rule |
|---|---|
| BR-001 | A user may belong to many colleges in the schema; v1 UI allows one active membership. |
| BR-002 | Only `active` members with verification level ≥ 1 can post or interact; level policy is per tenant. |
| BR-003 | Moderators cannot change roles; only admins can. Admins cannot delete audit logs. |
| BR-004 | Student's application tracker is never visible to anyone else. |
| BR-005 | A user cannot approve their own verification or join request. |
| BR-006 | Posts keep authorship after the author leaves (anonymised "former member") unless deletion requested; deletion rules in doc 13. |
| BR-007 | Content hidden by moderation remains stored for audit for the retention period. |
| BR-008 | No payment is processed or promised; price fields are informational. |
| BR-009 | Platform staff cannot read private student content without an audited, time-limited support grant. |

## 8. Acceptance criteria (representative; full set per feature in doc 07)
- **AC-TEN-001** Given two tenants A and B with data, when a member of A calls any list endpoint, then no B rows are returned, and fetching a B row by id returns 404.
- **AC-VER-002** Given tenant allows email-domain and domain is `acme.edu`, when a user verifies `x@acme.edu` via code, then membership becomes `active` level 2 and an audit entry exists; when the address is `x@gmail.com`, then membership stays `pending`.
- **AC-VER-003** Given an invite code with max_uses = 1 already used, when another user redeems it, then API returns `409 INVITE_EXHAUSTED` and nothing changes.
- **AC-TMF-004** Given a role with slots = 1 and two pending requests, when the owner accepts both concurrently, then exactly one succeeds and the other returns `409 SLOTS_FULL`.
- **AC-APP-004** Given user U has an application, when any other user or admin requests it, then `404`.
- **AC-RPT-002** Given a report on a post, when a moderator hides it, then it disappears from lists, an audit entry exists, and the author is notified.

## 9. Edge cases and failure scenarios
Duplicate submissions; concurrent accept; expired OTP; user in two tenants; tenant suspended mid-session; admin removes last admin (blocked); deleted author's content; roster with duplicate emails; very long text; unicode names; image upload interrupted; offline form submit. Handling in doc 18.

## 10. Dependencies, constraints, assumptions
Supabase availability and limits; email deliverability; pilot college cooperation; five-person capacity; legal review pending; free tier restrictions. Assumptions: A-01 students own smartphones; A-02 a college contact exists; A-03 English UI is acceptable at first. All UNV.

## 11. Analytics (privacy-safe; no message content)
Events: `signup_started`, `otp_verified`, `join_requested`, `verification_completed`, `profile_completed`, `team_post_created`, `join_request_sent/accepted`, `application_created/status_changed`, `report_created`. Properties: tenant id (hashed or internal), module, device class. No PII in events.

## 12. Out of scope
See doc 02 non-goals and doc 05 Tier 3.

## 13. Open questions
`../OPEN_QUESTIONS.md`

## 14. Traceability
Requirement → tests: `../04_SECURITY_QUALITY_OPS/20_TEST_STRATEGY.md` §8 and `../06_GTM_RISK_GOVERNANCE/31_PROJECT_GLOSSARY_AND_TRACEABILITY.md`.
