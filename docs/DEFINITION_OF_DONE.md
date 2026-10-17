> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# DEFINITION OF DONE (DoD)

| Field | Value |
|---|---|
| Doc ID | DOC-DOD |
| Version | 0.1.0 |
| Owner | R5 (QA) enforces; all comply |

A task is **Done** only when **every** item below is true. "It compiles" or "AI wrote it" is never Done. Evidence (link or screenshot) goes in the PR.

## A. Every task / pull request
- [ ] Acceptance criteria in the task are each demonstrably met (checked one by one in the PR description).
- [ ] Code reviewed and approved by one person who is **not** the author; for security-sensitive code (auth, RLS, uploads, permissions) the reviewer is R2 or R5.
- [ ] Formatter, linter, and type-check pass in CI.
- [ ] Required tests were **actually run**; the output is linked or pasted. No test is reported passing unless seen passing.
- [ ] New or changed behaviour has automated tests (unit/integration/e2e as listed in the task).
- [ ] Server-side validation (Zod) and server-side authorization exist; UI hiding is not security.
- [ ] Tenant isolation: any new tenant-scoped table has `college_id`, RLS enabled, and a cross-tenant negative test.
- [ ] Error, empty, loading states implemented for every new screen.
- [ ] Accessibility basics: keyboard reachable, labels, focus visible, contrast.
- [ ] No secrets, tokens, real student data, or `.env` files committed.
- [ ] No unnecessary new dependency; any new dependency verified (exists, maintained, license, size).
- [ ] Docs updated: API contract, data model, ADR (if a decision changed), traceability row.
- [ ] A **build-session learning file** exists for anything new learned (see Learning Base).
- [ ] The incomplete parts (if any) are hidden behind a feature flag and recorded in the PR + `CHANGELOG.md`.

## B. Day-level done (the team rule)
A task assigned to a day is complete **that day**. To make this achievable without lowering quality:
1. Tasks are sized to fit a day; the owner confirms size at the daily sync.
2. At the **midday checkpoint**, anyone at risk raises a blocker. Options, in order: ask for help, swap in the backup owner, **cut scope** (never quality gates).
3. Cutting scope moves the cut part to the "Deferred" list with an owner and date; it does not silently vanish.
4. Security, tenant isolation, and data-integrity checks are **never** cut.

## C. Feature-level done
Task-level Done + the user journey passes end-to-end on **staging**, QA signed off, and the traceability matrix links requirement → design → code → test.

## D. Learning done
A teammate other than the author can: explain the feature, trace a request UI → API → DB → back, run its tests, name likely failure modes, and make a small change safely.
