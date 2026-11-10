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
5. Create an access token (account menu, Access Tokens). Name it `github-staging`. What worked for us, and why:
   - **Resource access: Project**, organisation = yours, **only the project `studentos-staging`**. Never give a token the whole organisation.
   - **Expires: 90 days.** Put a reminder in your calendar for day 80: create a new token, replace the GitHub secret, delete the old token.
   - **Permissions:** **Read** on every capability in the list (the Supabase CLI reads several settings of the project when it links, and a missing one stops it with "Missing required permission(s)" or "does not have the necessary privileges"), and **Read-write only on Database and Migrations**. Nothing else gets read-write. With the first, narrower tokens the workflow failed one permission at a time (API Keys, then others), so for staging (fake data, one project) the broad Read is the practical choice.
   - The token is shown **once**. Save it in the password manager, paste it into the GitHub secret `SUPABASE_ACCESS_TOKEN`, and delete older tokens you made while trying.
   - For **production** make a separate token, and keep it as narrow as you can (see docs/PRODUCTION_SETUP.md).
6. Copy the two API keys you need later (Project Settings, **API Keys**): the **Publishable** key (starts with `sb_publishable_`, public by design) and the **Secret** key (starts with `sb_secret_`, private). Newer Supabase projects use these names; older ones show `anon` and `service_role` keys, which work the same way in the app. Only the Secret key (or `service_role`) is private.

## 2. GitHub secrets and variables

In the repository: Settings, Secrets and variables, Actions.

| Kind | Name | Value |
|---|---|---|
| Secret | `SUPABASE_ACCESS_TOKEN` | the access token from step 1.5 |
| Secret | `STAGING_DB_PASSWORD` | the database password from step 1.1 |
| Variable (optional) | `STAGING_DB_HOST` | only if the Supabase "Session pooler" host of your project is not `aws-0-ap-northeast-1.pooler.supabase.com`. The workflow builds the IPv4 pooler connection string itself from `STAGING_DB_PASSWORD`, because GitHub's servers only have IPv4 and the direct database address is IPv6 only |
| Variable | `STAGING_SUPABASE_PROJECT_REF` | the project reference from step 1.2 |
| Variable | `STAGING_URL` | the staging site address from step 3 (add it after step 3) |

| Secret (optional) | `STAGING_CRON_SECRET` | the same value as `CRON_SECRET` of the staging Vercel project. The hourly Maintenance workflow uses it. Without it that workflow skips staging |

Not used any more: a secret called `STAGING_DB_URL`. If you created one, delete it (it held a password).

Never put the production password or token here. Production gets its own, with fewer people, on Day 9.

## 3. Vercel staging site

1. In Vercel, import the GitHub repository as a new project named `studentos-staging`. Framework: Next.js. Production branch: `main`. Node.js version: 24.x (the project needs 24.15 or newer).
2. Environment variables for this project (Production environment of this Vercel project, which is our staging):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | the project address, for example `https://studentos-staging.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase staging, Project Settings, API, Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **Publishable** key (`sb_publishable_...`) of the staging project, or the old `anon` key. Type: Config (it is public) |
| `SUPABASE_SERVICE_ROLE_KEY` | the **Secret** key (`sb_secret_...`) of the staging project, or the old `service_role` key. Mark it **Sensitive**. Server only, never in a `NEXT_PUBLIC_` name |
| `APP_HASH_SECRET` | a new random secret of 32 or more characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Different from local and from production |
| `CRON_SECRET` | a new random secret of 24 or more characters: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`. Mark it Sensitive. Different from production |
| `NEXT_PUBLIC_API_MOCKING` | `disabled` |
| `NEXT_PUBLIC_EMAIL_SIGNIN` | `disabled` until an email sender (SMTP) and the email template are set up. The sign in page then shows the email form disabled with "Coming soon" and Google is the way in. Set to `enabled` (or remove) when email codes work |
| `NEXT_PUBLIC_GOOGLE_SIGNIN` | `enabled` once Google is set up in Supabase (docs/PRODUCTION_SETUP.md, Continue with Google) |

3. The free Hobby plan is for non-commercial use (decision D-11). Staging has fake data only, so this is allowed. Real students need a paid plan.
4. Deploy. If a setting is missing the server exits at start and the Vercel logs say which one.
5. **Every `NEXT_PUBLIC_` variable is built into the pages**, so after you add or change one you must **Redeploy** (turn off "Use existing Build Cache"). Add `NEXT_PUBLIC_APP_URL` after the first deploy, when you know the address, and redeploy.
6. Use type **Config** for the `NEXT_PUBLIC_` variables and **Sensitive** for `SUPABASE_SERVICE_ROLE_KEY`, `APP_HASH_SECRET` and `CRON_SECRET`.

## 4. First data and first check

1. Actions, workflow **Staging**, Run workflow, tick **seed**. It applies the migrations and loads `supabase/seed.sql` (Alpha College and Beta Institute, fake users). Use the seed option only on staging and only the first time: the seed file adds fixed rows and fails if they already exist. Resetting staging data is a rare, deliberate step for R2 and R5 together (`pnpm supabase db reset --linked` wipes the linked project, so check the linked project is staging first).
2. Run the smoke test: `node scripts/smoke.mjs https://your-staging-url`. All 7 checks must pass.
3. After this, every merge to `main` runs the workflow by itself and the smoke test waits until the new commit is live.
4. **Continue with Google on staging** (do it before real people test): follow docs/PRODUCTION_SETUP.md section 3, "Continue with Google", with the staging address. In short: Google Cloud project, consent screen (External, scopes email, profile, openid, your Google account as a test user), an OAuth client of type Web application with the authorized JavaScript origin `https://<staging address>` and the redirect URI `https://<project ref>.supabase.co/auth/v1/callback`; then in Supabase turn Google on with the client ID and secret, and under URL Configuration add `https://<staging address>/**` to Redirect URLs; then set `NEXT_PUBLIC_GOOGLE_SIGNIN=enabled` in Vercel and redeploy. Test it in a normal browser window.
5. **Make yourself Global admin** (the environment check fails with "no active admin: global" until someone is): join Global once with your own account, then run the SQL in docs/PRODUCTION_SETUP.md section 6, step 4, in the Supabase SQL Editor. The editor says "Success. No rows returned" for an UPDATE even when it worked, so check with `select u.email, m.role, m.status from public.memberships m join auth.users u on u.id = m.user_id where m.college_id = (select id from public.colleges where slug = 'global');`.
6. **Run the environment check from your own computer.** Create a file **outside the project folder**, for example `C:\secrets\studentos-staging.env`, with these four lines and your real values (no quotes, no spaces around `=`, no `<` or `>`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   CRON_SECRET=<the same value as in Vercel>
   ```
   Then `pnpm env:check --app https://<staging address> --env C:\secrets\studentos-staging.env`. It must end with `READY` (35 of 35). A line that says a key "was rejected" means a value in the file is wrong (often a placeholder that was never replaced).

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

## Where every secret and setting lives (names only, never values)

| Where | Name | Kind | What it is for |
|---|---|---|---|
| GitHub, Actions secrets | `SUPABASE_ACCESS_TOKEN` | secret | lets the Staging workflow link and push migrations (token from step 1.5) |
| GitHub, Actions secrets | `STAGING_DB_PASSWORD` | secret | database password; the workflow builds the IPv4 pooler connection string from it |
| GitHub, Actions secrets | `STAGING_CRON_SECRET` | secret, optional | lets the hourly Maintenance workflow call staging |
| GitHub, Actions variables | `STAGING_SUPABASE_PROJECT_REF` | variable | which Supabase project |
| GitHub, Actions variables | `STAGING_URL` | variable | the staging site, for the smoke test |
| GitHub, Actions variables | `STAGING_DB_HOST` | variable, optional | pooler host if it differs from the default |
| Vercel (project `studentos-staging`, Production) | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_MOCKING`, `NEXT_PUBLIC_GOOGLE_SIGNIN`, `NEXT_PUBLIC_EMAIL_SIGNIN` | Config | public settings, built into the pages |
| Vercel (same) | `SUPABASE_SERVICE_ROLE_KEY`, `APP_HASH_SECRET`, `CRON_SECRET` | Sensitive | server secrets. Never change `APP_HASH_SECRET` later |
| Supabase, Authentication | Email provider, Confirm email, OTP 6 and 600, templates, Site URL, Redirect URLs, Google provider (client ID and secret) | settings | sign in |
| Google Cloud | project, consent screen, OAuth client (ID and secret), test users | settings | Continue with Google |
| Your computer, outside the repo | `studentos-staging.env` | file | only for `pnpm env:check` |
| Password manager | database password, access token, Google client secret, `APP_HASH_SECRET`, `CRON_SECRET` | secrets | the only place they are written down |

## Problems we met on the way (and what fixed them)

| What you see | Cause | Fix |
|---|---|---|
| Staging workflow: `Missing required permission(s)` or `does not have the necessary privileges` at "Link the staging project" | the access token lacks a read permission | make a new token with Read on everything (step 1.5) and replace the GitHub secret |
| `IPv6 is not supported on your current network` at "Show what will be applied" | GitHub's servers have no IPv6, and the direct database address is IPv6 only | already handled: the workflow uses the IPv4 pooler string it builds from `STAGING_DB_PASSWORD` |
| `password authentication failed for user "postgres"` | `STAGING_DB_PASSWORD` is not the real database password (typo, placeholder, or an old password) | reset the database password in Supabase (letters and numbers only, 16 or more), update the secret, run the workflow again |
| `/api/...` answers 500 on the deployed site, pages load | a required variable is missing or wrong in Vercel | open the Vercel runtime log: it names the variable. Fix it and redeploy |
| `pnpm env:check` fails every line that uses a key, or says a key was rejected | a placeholder or wrong value in the `.env` file | copy the real keys (step 1.6) and the real `CRON_SECRET` |
| Smoke test: `shows the seeded college (status 404)` | migrations ran but the seed did not | run the Staging workflow once with **seed** ticked |
| `Continue with Google` button missing, or the start link comes straight back with `google_unavailable` | `NEXT_PUBLIC_GOOGLE_SIGNIN` is not `enabled` in the build that is live | check the name, the value, that **Production** is ticked, then redeploy without the build cache |
| After sign in with Google you land on the public home page | fixed in the app (page `/start`) | make sure staging runs a version with PR #45 |
| A PR targeting another branch shows only one check | CI only runs for pull requests aimed at `main` | merge in order so each PR is retargeted to `main`; after retargeting, close and reopen the PR to start CI |
| The email code does not arrive | no email sender yet; the default Supabase sender only reaches your own team and is very limited | use Continue with Google, set `NEXT_PUBLIC_EMAIL_SIGNIN=disabled` (Coming soon), and set up SMTP and the template later (docs/PRODUCTION_SETUP.md section 3) |

