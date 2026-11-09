# Staging setup (owner and R5)

Staging is a second copy of the app with **fake data only**. Every merge to `main` updates its database and
the site. Nothing here uses real students. Production is separate and comes on Day 9 (see
`docs/BACKUP_AND_RELEASE_RUNBOOK.md`).

What the code already does (merged by R5 on Day 2):

| Piece | Where | What it does |
|---|---|---|
| Startup check | `src/instrumentation.ts`, `src/lib/startup-check.ts` | In production mode the server exits at once if a needed setting is missing, and names the setting (never the value) |
| Health and ready | `GET /api/health`, `GET /api/ready` | Is the app running, and can it reach the database. `health` also shows the commit that is live |
| Staging workflow | `.github/workflows/staging.yml` | On every merge to `main`: apply migrations to the staging project, then run the smoke test. Until the secrets below exist it says what is missing and ends green |
| Smoke test | `scripts/smoke.mjs` | 7 read-only checks of a deployed copy. Run by the workflow, or by hand: `node scripts/smoke.mjs https://your-staging-url` |

What only the account owner can do (R5 cannot create accounts or paste secrets for you). Names of buttons may
change. If a step does not match, check the official page and fix this file in your pull request.

## 1. Supabase staging project

1. In Supabase create a new project named `studentos-staging`. Choose the region closest to the students. Set a strong database password and keep it in the team password manager. Do not post it in Slack or GitHub.
2. Note the **project reference** (Project Settings, General). It looks like `abcdefghijklmnop`.
3. Authentication settings (Authentication, then Sign In / Providers, then Email). They must match `supabase/config.toml`:
   - Email sign in on, "Confirm email" ON (the local stack has it on too since Day 9: the sign in tests pass with it on and it stops anyone creating an account for an email they do not own), email OTP length 6, OTP expiry 600 seconds.
   - Email templates: open "Magic Link" and "Confirm signup". Paste the content of `supabase/templates/otp.html` into both. The code is `{{ .Token }}`.
   - URL configuration: Site URL = your staging site address (step 3).
4. Email sending. The built-in sender of a hosted project has a very low hourly cap and is only meant for the team, not for tests. Before the Day 2 checkpoint set up a custom sender (SMTP) with a provider (candidates in `docs/PROVIDER_CHECK.md`, the choice is still open, decision D-11). Check the official pricing and free caps first. Never use real student emails in staging.
5. Create an access token (account menu, Access Tokens). Name it `github-staging`.

## 2. GitHub secrets and variables

In the repository: Settings, Secrets and variables, Actions.

| Kind | Name | Value |
|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | the access token from step 1.5 |
| Secret | `STAGING_DB_PASSWORD` | the database password from step 1.1 |
| Variable (optional) | `STAGING_DB_HOST` | only if the Supabase "Session pooler" host of your project is not `aws-0-ap-northeast-1.pooler.supabase.com`. The workflow builds the IPv4 pooler connection string itself from `STAGING_DB_PASSWORD`, because GitHub's servers only have IPv4 and the direct database address is IPv6 only |
| Variable | `STAGING_SUPABASE_PROJECT_REF` | the project reference from step 1.2 |
| Variable | `STAGING_URL` | the staging site address from step 3 (add it after step 3) |

Never put the production password or token here. Production gets its own, with fewer people, on Day 9.

## 3. Vercel staging site

1. In Vercel, import the GitHub repository as a new project named `studentos-staging`. Framework: Next.js. Production branch: `main`. Node.js version: 24.x (the project needs 24.15 or newer).
2. Environment variables for this project (Production environment of this Vercel project, which is our staging):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | the project address, for example `https://studentos-staging.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase staging, Project Settings, API, Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon (public) key of the staging project |
| `SUPABASE_SERVICE_ROLE_KEY` | the service role key of the staging project. Mark it as sensitive. Server only |
| `APP_HASH_SECRET` | a new random secret of 32 or more characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Different from local and from production |

3. The free Hobby plan is for non-commercial use (decision D-11). Staging has fake data only, so this is allowed. Real students need a paid plan.
4. Deploy. If a setting is missing the server exits at start and the Vercel logs say which one.

## 4. First data and first check

1. Actions, workflow **Staging**, Run workflow, tick **seed**. It applies the migrations and loads `supabase/seed.sql` (Alpha College and Beta Institute, fake users). Use the seed option only on staging and only the first time: the seed file adds fixed rows and fails if they already exist. Resetting staging data is a rare, deliberate step for R2 and R5 together (`pnpm supabase db reset --linked` wipes the linked project, so check the linked project is staging first).
2. Run the smoke test: `node scripts/smoke.mjs https://your-staging-url`. All 7 checks must pass.
3. After this, every merge to `main` runs the workflow by itself and the smoke test waits until the new commit is live.

## 5. Signing in on staging (important)

The seed users have `.test` addresses, which cannot receive mail. For tests that need a code on staging, the
test sets up the code with the service role key (`auth.admin.generateLink` returns the code without sending
mail). That key lives only in the GitHub secrets of the test job. Real mailboxes are used only for the manual
check at the end of each checkpoint. Never switch on a fixed "test code" feature on staging or production.

## 6. Checkpoint 1 on staging (end of Day 2)

Needs R2's endpoints (merged), R3's screens (not built yet) and this setup. Checklist for the run with R2 and R3:

- [ ] `node scripts/smoke.mjs` passes on the staging address
- [ ] Sign in with an email code from a real mailbox
- [ ] Join with an invite code (create one with the Day 3 admin endpoint, or insert one in the staging database)
- [ ] Join with a college email address
- [ ] Manual request shows the pending screen
- [ ] Results posted in `#daily-reports`

## Rotating or removing

If a token or password leaks: revoke it in Supabase or Vercel at once, create a new one, update the GitHub secret, post in `#blockers` (without the value). To reset staging data, see the note in section 4.
