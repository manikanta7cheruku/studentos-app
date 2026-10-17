> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 17 - Coding Standards and Engineering Guidelines

| Field | Value |
|---|---|
| Doc ID | DOC-17 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (R3 co-owner for frontend) |
| Status | Proposed |

## 1. Naming
Files/folders `kebab-case`; React components `PascalCase`; functions/variables `camelCase`; types `PascalCase`; constants `UPPER_SNAKE`; DB `snake_case`; API JSON `snake_case`; env vars `UPPER_SNAKE` prefixed by purpose (`SUPABASE_`, `SENTRY_`). Operation IDs and error codes exactly as in doc 14. Branches `feat|fix|chore|docs/<task-id>-short-name`; commits in Conventional Commits (`feat(team-finder): …`).

## 2. Structure
See doc 11 §5. Feature-first folders; shared code only in `packages/*`. No circular imports; cross-module access via module index. Max ~300 lines per file and ~50 lines per function as review heuristics.

## 3. Formatting, linting, types
Prettier (single config); ESLint with TypeScript, React hooks, jsx-a11y, import-order, and custom rules: no `service-role` import outside allowlist; no `any` without `// eslint-disable-next-line` + reason; no `console.log` in app code (use logger). TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. CI fails on any warning in changed files.

## 4. Validation and types
Zod schemas in `src/contracts` are the single definition for requests, responses, and DB row mappers; types are inferred, never hand-duplicated. Validate at the boundary (route handler); services trust validated inputs. Never trust client-supplied `college_id`, `user_id`, role, or status.

## 5. Error handling
Throw `AppError(code, status, message, details?)`; services never return HTTP; route handler maps to envelope; unknown errors → `INTERNAL` with log + Sentry. No empty `catch`. User messages from the message catalogue; never leak stack traces, SQL, or internal ids in responses.

## 6. Logging
`logger.info/warn/error({ event, request_id, tenant_id, user_id_hash?, route, duration_ms, … })`. **Never log:** emails, OTPs, tokens, invite codes, enrollment numbers, message bodies, application notes. Levels: debug (dev only), info (business events), warn (recoverable), error (needs attention).

## 7. Database access
Parameterised queries only; no string-built SQL; user-scoped client by default; transactions via SQL functions for multi-step writes; migrations only through files (doc 13 §7).

## 8. Frontend rules
Server state via TanStack Query; local state minimal; forms via React Hook Form + Zod resolver; no direct `fetch` - use the typed client; components from `src/components/ui` only; no raw colour values; all strings via catalogue; every data view implements loading/empty/error.

## 9. Security-by-default rules
Sanitise any rendered user HTML (we render **plain text/markdown subset**, no raw HTML); links from users get `rel="noopener noreferrer ugc"`; only `https` URLs stored; uploads validated server-side; secrets only via env; CSP set; CSRF protections for cookie auth.

## 10. Dependency management
Doc 12 §8. Pin via lockfile; Renovate/Dependabot weekly; `pnpm audit` in CI; no packages added by AI without verification (name exact, publisher, downloads, last release, license).

## 11. Code review standards
- Author: self-review first; PR ≤ ~400 changed lines (split otherwise); description with *what/why/how tested/screenshots/risks*; checklist = DoD.
- Reviewer: reads the code (not just the diff summary), runs the branch if risk is medium+, checks tests are meaningful (would they fail if the code were wrong?), checks auth + tenant isolation + validation + error handling, leaves comments classified **blocker / suggestion / question**.
- SLA: first review within 4 working hours; blockers resolved same day.
- Security-sensitive changes (auth, RLS, uploads, permissions, migrations): reviewer must be R2 or R5.

## 12. Prohibited shortcuts
Disabling RLS "temporarily"; using service role to "make it work"; committing `.env`; skipping tests with `.skip` without a linked issue; catching errors to hide them; copy-pasting AI code you can't explain; `// @ts-ignore`; hard-coded tenant ids; trusting UI hiding; ad-hoc SQL on production; force-push to `main`.

## 12b. AI-generated code requirements
Full rules in `../LEARNING_AND_KNOWLEDGE_BASE/AI_ASSISTED_DEVELOPMENT_RULES.md`. Summary: small diffs, reviewer reads every changed line, tests run for real, no security-critical code accepted without second human review, every AI-written non-trivial file gets a learning note.

## 13. Definition of done
`../DEFINITION_OF_DONE.md`.
