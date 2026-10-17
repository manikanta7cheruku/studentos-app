# Architecture

## The idea
One web app serves many colleges. Each college is a tenant. The database itself blocks one college from seeing another college's data. This is the most important rule in the project.

## Shape
A modular monolith. That means one app, one database, and clear folders for each feature. We do not use microservices. Five people cannot run many services.

## Parts
```
Browser
  |  (pages and forms)
Next.js app  (src/app, src/features)
  |  (typed API calls)
Route handlers  (src/app/api/v1/...)  check login, tenant, input (Zod)
  |
Services  (src/modules/*)  business rules, no HTTP code
  |
Database access  uses the user's login so Row Level Security (RLS) always applies
  |
Supabase: Postgres + Auth + Storage
```
Other services: email sender (login codes), Sentry (errors), PostHog (usage, no personal data).

## Folder layout
```
src/app/                 routes: /c/[slug]/..., /api/v1/..., /dev/components
src/features/<name>/     screens, hooks, api calls for one feature
src/modules/<name>/      backend logic for one feature
src/contracts/           Zod schemas + sample data (fixtures)
src/components/ui/       shared UI parts
src/lib/                 errors, logger, api client, flags, rate limit
supabase/migrations/     database changes (only R2 merges these)
supabase/seed.sql        fake data: two colleges (Alpha and Beta)
supabase/tests/          pgTAP tests (isolation and rules)
e2e/                     Playwright tests
```
Rule: a feature may use another feature only through its `index.ts`.

## Tenant rules
- Every college-owned table has `college_id` and RLS turned on.
- Pages live under `/c/{college-slug}/...`.
- The server checks: logged in, member of this college, active, right level and role, then the object itself.
- If someone asks for another college's item, answer 404 (not "forbidden").
- Admin tools that use the service role key live only in a small allowed folder and are never used in normal requests.

## Data flow example: accept a join request
Screen button, then `POST /api/v1/c/{slug}/join-requests/{id}/decision`, then Zod check, then service, then one SQL function that locks the role row, checks free slots, updates the request, adds a notification, all in one transaction. If the last slot is gone, the answer is 409 `SLOTS_FULL`.

## How frontend and backend work at the same time
1. R2 writes the contract (shape of requests and answers) and sample data in `src/contracts`.
2. R3 and R4 build screens using the sample data (MSW mocks).
3. When the real endpoint is ready, one setting switches from mock to real.
4. Contract tests make sure the real endpoint matches the contract.

## Environments
Local (Docker Supabase), CI, Staging (fake data only), Production (real data, paid plan with backups). See CI_CD_AND_ENVIRONMENTS.md.

## Things we do not build in v1
Payments, user-facing AI, scraping, anonymous posts, student ID upload, cross college network, microservices.

## Growth plan
Add indexes first, then caching, then bigger database. Split modules into services only if there is real proof it is needed.
