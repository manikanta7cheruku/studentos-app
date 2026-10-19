> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# AI-Assisted Development Rules

| Field | Value |
|---|---|
| Doc ID | DOC-28-AI |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (policy), R5 (enforcement in review) |
| Status | Proposed |

## 1. Mandatory rules
1. Understand the task and acceptance criteria **before** prompting.
2. Give the AI the relevant context: contract excerpt, schema, standards, files; ask for a **small, reviewable** change (≤ ~200 lines).
3. Inspect **every** modified file; you must be able to explain each important change.
4. Verify package names, versions, APIs, and config against official docs (AI invents packages and options).
5. Run required tests; read the real output. **Never report a test as passing unless you ran it and saw it pass.**
6. Check authorization, tenant isolation, validation, error handling for every endpoint/query.
7. **Never trust AI-generated** secrets, crypto, auth logic, RLS policies, or migration SQL without a second human review by R2 or R5 and a negative test.
8. No unnecessary dependencies; no over-engineering.
9. Never paste secrets, real student data, or private documents into AI tools.
10. Record learning in `docs/learning/<role-folder>/build-sessions/` (what AI produced / what you verified).
11. A build success or "looks right" is not completion; use the DoD.
12. Check licences of generated code/snippets and assets (doc 34).

## 2. Delegate vs human-approve
| Delegate to AI (still reviewed) | Requires human decision/approval |
|---|---|
| Boilerplate, types from schemas, test scaffolding, refactors with tests, docs drafts, SQL explain, regex | Architecture/ADR choices, schema design, RLS policies, auth flows, migrations, permission matrix, security fixes, dependency additions, legal text, production changes, release decisions, anything touching real data |

## 3. Prompt templates (copy, fill, keep the output reviewable)
**Feature implementation**
```
Context: StudentOS, Next.js App Router + TS, Supabase RLS, modular monolith. Task <ID>: <name>.
Acceptance criteria: <paste>. Contract: <paste op from doc 14>. Schema: <tables>.
Constraints: follow doc 17; validate with Zod; service layer has no HTTP; user-scoped DB client; tenant from path.
Deliver: only files <list>; explain each change in 3 bullets; list assumptions; do NOT add dependencies.
```
**API implementation:** same + "Return exact error codes from doc 14; include idempotency handling for IDEM ops; write contract tests."
**Database migration:** "Write a Supabase SQL migration for <change>. Include RLS policies, indexes, constraints, and pgTAP tests incl. cross-tenant negative tests. State lock impact and a compensating migration. Do not drop data."
**Unit/integration tests:** "Write tests for <function/endpoint> from these ACs. Include negative and edge cases. Tests must fail if the code is wrong; show one mutation that would be caught."
**Bug investigation:** "Symptom, expected, actual, logs/request_id, suspect files. Propose 3 hypotheses ranked, and the smallest experiment to confirm each. Do not change code yet."
**Code review:** "Review this diff for: tenant isolation, authz, validation, error handling, race conditions, logging of PII, test quality. List blockers/suggestions/questions."
**Security review:** "Act as an attacker for <endpoint>. List abuse cases (IDOR, mass assignment, enumeration, rate limits, injection) and the test for each."
**Documentation update:** "Given this diff, list which docs per the trigger table need updates and draft the changes."
**Learning a new technology:** "Explain <tech> for someone who knows <X>. Cover: problem solved, mental model, how we use it in StudentOS, common mistakes, 3 exercises. Cite official docs."
**Explain UI→DB→UI:** "Trace the request for <operation> through: component, API client, route handler, service, SQL/RLS, response, cache invalidation. Name files and functions."

## 4. Review checklist for AI-generated code (reviewer)
- [ ] Do I understand each line that matters? - [ ] Any invented API/package? - [ ] Tenant + authz enforced server-side? - [ ] Inputs validated? - [ ] Errors mapped to codes? - [ ] No secrets/PII in logs? - [ ] Tests meaningful and run? - [ ] No scope creep? - [ ] Licence of any copied code OK?

## 5. Evidence required in PR
"Commands run" block with output excerpt; link to CI run; note which parts were AI-assisted.
