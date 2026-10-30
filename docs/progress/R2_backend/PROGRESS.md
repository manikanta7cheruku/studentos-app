# Progress board - R2 Backend

Only R2 Backend tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

Everyone updates their own rows at the end of each task and each day. Status: Not started, In progress, In review, Blocked, Done.
"Done" means it passed the Definition of Done (docs/DEFINITION_OF_DONE.md), including tests you really ran.

| Day | Role | Task ID | Task | Status | PR link | Tests run (what you saw) | Learning file | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | R2 | R2-D1-1 | Database foundation (tenants, members, audit) | In review | https://github.com/manikanta7cheruku/studentos-app/pull/10 | pnpm db:reset ok. pnpm db:test: 4 files, 94 tests, PASS. Two deliberate breaks (RLS off on profiles, audit guard disabled) made tests fail, then all 94 passed again. pnpm verify passed (63 tests, build ok) | docs/learning/R2_backend/build-sessions/D01_R2_db-foundation.md | Draft PR. Needs a second human review of the policies and grants before merge. Open question: suspended college is not checked in RLS (API does it on Day 2) |
| 1 | R2 | R2-D1-2 | Contracts and sample data for Days 2 to 4 | In review | https://github.com/manikanta7cheruku/studentos-app/pull/11 | pnpm vitest run src/contracts: 104 passed. Two broken fixtures made tests fail, then 104 passed again. pnpm verify passed (167 tests, build ok) | docs/learning/R2_backend/build-sessions/D01_R2_api-contract.md | Draft PR. Merge PR #10 first (both change package.json and the lockfile), then merge main here and run pnpm install. R3 has not confirmed yet that they can read the contracts |
