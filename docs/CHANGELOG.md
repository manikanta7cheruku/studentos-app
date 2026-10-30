# Changelog

| Date | Change | By |
|---|---|---|
| Day 0 | Project started with the main docs. | Admin |
| Day 1 | R5: project scaffold and CI merged to main (PR #1). Developer setup guide added in docs/DEV_SETUP.md. Provider check filled in docs/PROVIDER_CHECK.md | R5 |
| Day 1 | R2: database foundation (colleges, domains, settings, profiles, memberships, audit log, RLS, seed, pgTAP tests) merged (PR #10). New commands: pnpm db:start, db:stop, db:reset, db:test. API contracts (Zod) and sample data for Days 2 to 4 merged (PR #11). Import from @/contracts | R2 |
| Day 2 | R2: email code login (AUTH-01 to 03), membership lookup (TEN-02), public college (TEN-01), join by invite code, college email and manual request (TEN-03 to 05), rate limits, idempotency keys. New commands: pnpm test:integration. New variables in .env.example: Supabase keys and APP_HASH_SECRET. Details: docs/API_CONTRACT.md section 7 | R2 |
| Day 2 | R5: CI runs database tests and integration tests (jobs on every pull request), permission matrix and database API exposure tests, Playwright journeys (workflow E2E), startup check, /api/health and /api/ready, staging workflow and smoke test, runbook docs/STAGING_SETUP.md. New commands: pnpm env:local, pnpm test:e2e. Node 24.15 or newer is now required | R5 |
