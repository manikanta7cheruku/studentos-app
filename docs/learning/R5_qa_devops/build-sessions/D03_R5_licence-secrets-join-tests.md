# Licence check, secret scan, join journeys and contract coverage - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-15 / Uday1217k, R5 Testing and DevOps |
| Linked task / ADR / PR | R5-D3-1 / ADR-007 / https://github.com/manikanta7cheruku/studentos-app/pull/64 |
| Related docs | docs/LICENSING.md section 4, docs/TESTING.md sections 5 and 6, docs/CI_CD_AND_ENVIRONMENTS.md section 3, docs/THIRD_PARTY_REGISTER.md, docs/ASSETS_REGISTER.md, docs/SERVICES_REGISTER.md |

## 1. What we are learning and why it is needed
Four automatic checks that run on every pull request: a licence check for every dependency, a secret scan of the whole git history, browser journeys for the join paths, and a test that makes sure every endpoint's answer shape is compared with src/contracts. The habit behind all four: a check is only trusted after it has been made to fail on purpose.

## 2. What problem it solves
A dependency with a licence we may not use (GPL in a closed product) can arrive in one line of a lockfile. A secret that was ever committed stays in git history even if the file is later deleted. Join paths that only the API tests cover can break on the screen without anyone noticing. An endpoint can answer in a shape that differs from its contract if no test ever compares them.

## 3. Concepts and terminology (short glossary)
SPDX expression: a licence written as a formula, for example `(MIT OR CC0-1.0)` or `Apache-2.0 AND LGPL-3.0-or-later`. Allowed list: the licences LICENSING.md allows (`licenses.allow.json`). Exception: a package outside the list that someone approved with a reason, a name and a date (`licenses.exceptions.json`). Pending exception: a proposal that approves nothing. gitleaks: a tool that scans every commit for secrets. Fingerprint: gitleaks' id for one finding (commit, file, rule, line). Exact-value allow list: a list of the specific fake values that may appear, not a folder. Contract: the shape of a request or answer, written as a Zod schema in src/contracts. expectMatches: the test helper that checks a real answer against a schema. Known gaps: the endpoints not yet compared with a real answer, listed so the list can only shrink. Break on purpose: change the code so the check must fail, and see it fail.

## 4. How it works internally (appropriate depth)
Licence check: `pnpm licenses list --json` gives every installed package and its licence. scripts/licence-lib.mjs reads the licence as a formula: OR needs one allowed side, AND needs both, AND binds tighter than OR, and anything unreadable is refused. A package outside the list passes only through an exception with the same name (a trailing star matches a prefix) and the same licence text. An exception counts as approved only with `approvedBy` and a date. `--strict` also fails while any exception is pending.
Secret scan: gitleaks 8.30.1 scans the diff of every commit on every branch with its default rules. CI downloads the pinned Linux tarball and checks its SHA-256 before running it. The five known fake test values are allowed by exact value in `.gitleaks.toml`.
Contract coverage: tests/contract-coverage.test.ts finds each response schema's exported name by object identity, scans tests/integration for `expectMatches(<name>`, and compares the endpoints with no check against the known-gaps list. It works per schema: two endpoints that share one schema object (joinInviteResponse and joinOpenResponse) count as covered when either is checked.

## 5. How it is used in StudentOS (files/modules)
licenses.allow.json, licenses.exceptions.json, scripts/licence-lib.mjs, scripts/check-licenses.mjs, tests/licences.test.ts, .gitleaks.toml, .github/workflows/ci.yml (jobs "Licence check" and "Secret scan"), e2e/join-journeys.ui.spec.ts, e2e/helpers.ts (cleanUp), tests/contract-coverage.test.ts, tests/integration/admin-content.test.ts, docs/THIRD_PARTY_REGISTER.md, docs/ASSETS_REGISTER.md, docs/SERVICES_REGISTER.md.

## 6. Request/response and data flow (diagram or numbered trace)
College email join in the browser: 1. Sign in with an email code. 2. On /c/alpha/join choose "College email". 3. Type an address on a registered college domain and press "Email me a code". 4. POST /api/v1/c/alpha/join/email-domain with step start sends a code to that address. 5. Type the code. 6. The same endpoint with step complete makes the person an active member at verification level 2. 7. The page goes to /c/alpha/home.
Pull request: push, then GitHub starts the CI jobs in parallel (Licence check, Secret scan and the existing ones), and every job must be green.

## 7. API methods, endpoints, schemas, status codes
TEN-05 POST /c/{slug}/join/email-domain (start, complete; an address outside the college's domains gives 400 VALIDATION_FAILED). TEN-03 POST /c/{slug}/join/invite (used up gives 409 INVITE_EXHAUSTED, expired gives 410 INVITE_EXPIRED, wrong gives 400 INVITE_INVALID). ADM-07 verification decision (a reject needs a reason of at least 5 characters). ADM-14 GET /c/{slug}/admin/content and ADM-13 POST /c/{slug}/admin/content/remove (reasons: spam, inappropriate, harassment, scam, duplicate, other; removing twice gives 404 NOT_FOUND).

## 8. Database changes and relationships
None. The ADM-13 test inserts a team_posts row as the "plan", and the database function content_remove sets its status to removed and writes one audit row.

## 9. Authentication / authorization behaviour
Moderators and admins may call ADM-13 and ADM-14 (already covered by permission-matrix.test.ts). The service role key is used only by test helpers that refuse to run against anything but the local stack. A code sent to an address outside the college's domains can never join the college.

## 10. Errors and edge cases
Licence names differ by operating system: Windows shows `@img/sharp-win32-x64` and Linux shows `@img/sharp-libvips-linux-x64`, so the exception matches by prefix. A folder dependency has no version, which printed "@null" until the fix. gitleaks on CI scans every branch (316 commits) and found the same fake values in older commits of other branches, so fingerprints were replaced by exact values. A deleted remote branch stays on the laptop as a remote-tracking ref until `git fetch --prune`, and gitleaks found the fake key through it.

## 11. Tests: what exists and how to run them (exact commands)
`pnpm licenses:check` and `pnpm licenses:check -- --strict` (the strict form fails while exceptions are pending). `pnpm exec vitest run tests/licences.test.ts` (16 tests). `pnpm exec vitest run tests/contract-coverage.test.ts` (3 tests). `pnpm test:integration -- tests/integration/admin-content.test.ts` (5 tests, needs `pnpm db:start`, `pnpm db:reset`, `pnpm env:local`). `pnpm test:e2e e2e/join-journeys.ui.spec.ts` (5 journeys in a desktop and a phone browser; needs `pnpm exec playwright install chromium` once). `gitleaks git --redact --verbose .` (gitleaks 8.30.1 installed from a checksum-verified download).

## 12. How to debug common failures
`.env.local already exists. Use pnpm env:local -- --force to replace it.` followed by 21 failing integration files: the old .env.local had empty keys. Fix: `pnpm env:local -- --force` while the local stack runs. `AssertionError: expected 935.1612000000005 to be less than 600` in performance.test.ts: the 4000 new rows have no table statistics yet, so Postgres reads every row and the row security policy runs on each (278 ms in psql, 4 ms after ANALYZE). It passes in CI. It is a finding for R2, not caused by Day 3. Secret scan red in CI but clean on the laptop: the laptop did not have the other branches. gitleaks reports a leak after cleanup: run `git fetch --prune`. A check that stays green when you break the code is a bad check.

## 13. Security considerations
No real secret was found. The five findings were fake test values, checked one by one by context and by searching the rest of the repository. The fake key for the proof was generated at run time and never printed. gitleaks output is masked with --redact. The gitleaks download is checked against a committed SHA-256. R5 proposed the licence exceptions and approved none of them.

## 14. Alternatives and trade-offs
gitleaks CLI against the gitleaks GitHub action: the CLI is MIT and pinned by checksum, the action's licence shows as NOASSERTION and it may need a licence key. Own licence script against an extra package: the script handles SPDX AND and OR and the exception rule with no new dependency. Per-commit fingerprints against exact values: fingerprints grow with every squash merge. Coverage per schema against per endpoint: per schema is simpler and still compares real answers with a real schema, but it can hide an endpoint that shares a schema.

## 15. What AI generated or suggested (prompts used, summary)
An AI assistant (Claude) wrote the licence script and its tests, the CI jobs, the journeys, the coverage test, the ADM-13 and ADM-14 test, the registers and the commands, in small steps with real output pasted back. Mistakes it made and how they were found: it wrote "5 pending" where the real number is 4; a PowerShell line (`else` on a new line) did not parse, so one cleanup change was not applied until it was redone; it said a scan ran "without the ignore list" when gitleaks also reads the repository's own ignore file; its first commit gate checked exit codes but not that every break turned red; it first explained a green "break" wrongly (another file) when the real reason was a schema alias.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
The R5 person ran every command and pasted the real output. Verified by running: the licence check on Windows and on Linux in CI; a made-up GPL package and a throwaway PR (#65) where the Licence check turned red; a random fake key and a throwaway PR (#66) where the Secret scan turned red; five breaks of the browser journeys; two breaks of the ADM-13 and ADM-14 test; three breaks of the coverage test. CI on PR #64 was green on the last commit (14 checks).
TYPE here: what you read or understood yourself, and anything you found different from this file

## 17. What each teammate can now explain/implement independently
Run the licence check and read its result, propose an exception the right way, run gitleaks locally, read a contract coverage failure and fix it, run the join journeys, and explain why a check must be shown to fail before it is trusted.

## 18. Further learning resources
https://github.com/gitleaks/gitleaks , https://spdx.github.io/spdx-spec/ (licence expressions) , https://pnpm.io/cli/licenses , https://playwright.dev/docs/intro , https://github.com/google/fonts (font licences in each METADATA.pb)

## 19. Docs updated because of this (per trigger table)
Added docs/THIRD_PARTY_REGISTER.md, docs/ASSETS_REGISTER.md, docs/SERVICES_REGISTER.md and three rows in docs/INDEX.md. Not updated yet (carryover): docs/TESTING.md and docs/CI_CD_AND_ENVIRONMENTS.md should mention the Licence check, the Secret scan, the contract coverage test and the new journeys.

## 20. Walkthrough drill: passed by / date
Pending. Reviewer: R2.
