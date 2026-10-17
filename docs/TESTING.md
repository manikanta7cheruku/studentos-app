> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 20 - Test Strategy

| Field | Value |
|---|---|
| Doc ID | DOC-20 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R5 QA lead |
| Status | Proposed. **No tests exist yet; no result is claimed.** |

## 1. Principles
Test critical behaviour, not a percentage. AI-written tests are reviewed for meaning (would it fail if the code were wrong?). A test is "passing" only when seen passing in CI or a recorded local run.

## 2. Test types
| Layer | Tool | Scope | Owner | Runs |
|---|---|---|---|---|
| Unit | Vitest | Services, validators, pure functions (slot math, status transitions, verification decisions) | Author of code | Every commit |
| Integration | Vitest + local Supabase | Route handlers against real DB with RLS | Author + R5 | PR |
| API contract | Vitest + OpenAPI/Zod | Status codes, envelopes, error codes | R2 + R5 | PR |
| Database | pgTAP | Constraints, RLS, functions, migrations on empty DB | R2 writes, R5 reviews | PR |
| Frontend component | Vitest + Testing Library | Forms, states, a11y roles | R3/R4 | PR |
| E2E | Playwright | Critical journeys (§5) in Chromium (+ WebKit/Firefox nightly) | R5 | PR (smoke), nightly (full) |
| Accessibility | axe via Playwright + manual keyboard/SR | P0/P1 pages | R4 + R5 | PR + release |
| Responsive/mobile | Playwright viewports 360/768/1280; real Android + iPhone manual | All P0 flows | R5 | Release |
| Security | pgTAP/negative API tests, gitleaks, `pnpm audit`, CodeQL, manual OWASP checks | Doc 19 | R2 + R5 | PR + release |
| Performance/load | k6 light (50 concurrent users, 5 min) + Lighthouse | Read endpoints, auth | R5 | Pre-beta |
| Failure injection | Mock provider outages (MSW), kill DB in staging, bad migration rehearsal | Doc 18 | R5 | Pre-beta |
| Exploratory | Charters, 45-min sessions, bug bash | New features | All | Day 6 |
| Regression | Full suite + bug-linked tests | All | R5 | Nightly/release |

## 3. Environments
Local (Docker Supabase) → CI (ephemeral DB) → Staging (fake data only, same migrations as prod) → Production (smoke tests only; synthetic account). No production data in any other environment.

## 4. Test data and cleanup
Seed per doc 13 §8; tests create data in a unique namespace (`test_<runid>`) and clean up; DB reset between pgTAP files; e2e uses seeded users with known tokens (`alice@alpha.test`).

## 5. Critical journeys (E2E)
J1 landing → sign-in → verify by domain → active · J2 invite redemption (valid, expired, exhausted) · J3 manual verification pending → admin approve · J4 profile + skills + project · J5 post team request → other user requests → owner accepts (slots) · J6 application tracker add/status/filter · J7 admin posts announcement; student sees it · J8 report → moderator hides · J9 cross-tenant attempt returns 404 (both UI and API) · J10 account deletion.

## 6. Permission and tenant-isolation suite (mandatory gate)
Matrix auto-generated from doc 14 ops × roles × tenants: for each operation call as each of {anon, pending, student A (tenant 1), student B (tenant 2), moderator, admin 1, admin 2, platform}. Assert allowed/denied per doc 15 matrix. Plus: every `public` table with `college_id` has RLS + ≥ 1 policy; attempts to insert rows with another tenant's `college_id` fail; views leak nothing; storage paths enforce tenant prefix.

## 7. Release gates (summary)
S1: unit + integration + pgTAP green; isolation suite 100%; J1–J9 pass; axe: no critical on P0 pages. S2: + restore drill passed; k6 baseline recorded; failure drills F3,F5,F20,F21 executed; manual SR check on J1/J5/J6. See `../RELEASE_CHECKLIST.md`.

## 8. Requirement-to-test mapping (excerpt; full matrix in doc 31 and `TRACEABILITY.csv`)
| Requirement | Tests |
|---|---|
| FR-TEN-002 / NFR-001 | TC-TEN-01..06 (isolation), pgTAP `rls_*` |
| FR-VER-002 | TC-VER-09..12 |
| FR-VER-003 | TC-VER-02..05 |
| FR-ADM-005 | TC-ADM-10; pgTAP `audit_append_only` |
| FR-TMF-004 | TC-TMF-12..14 incl. concurrency |
| FR-APP-004 | TC-APP-08 (admin & other user 404) |
| FR-RPT-002 | TC-RPT-03 |
| NFR-004 | axe + manual checklist |
| NFR-010 | TC-IDEM-01..02 |
Example test case: **TC-TMF-14** - *Given role slots=1 with two pending requests; when two concurrent accept calls run; then exactly one 200 and one 409 `SLOTS_FULL`, `filled=1`.*

## 9. Reporting
CI posts summary to PR; nightly report in channel; weekly metrics: pass rate, flaky tests (quarantine > 2 failures/week → fix within 2 days), escaped defects. Bug report format and severity: `../05_TEAM_AND_EXECUTION/26_ENGINEERING_WORKFLOW_AND_INTEGRATION.md` §9.
