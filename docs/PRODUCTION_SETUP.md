# Production setup (database, site, scheduler, first college)

Written by R2 for Day 9 (R2-D9-1). Staging is `docs/STAGING_SETUP.md` (fake data). Production is the same pieces with **real students**, so it has its own accounts, its own secrets, fewer people, and one extra rule: **nothing from `supabase/seed.sql` ever goes near it**.

What I (R2) cannot do for you: create accounts, pay for plans, paste secrets, click "run" on production. Those steps say **YOU**. Everything else is prepared as a script, a test or a checklist. Button names change; if a step does not match the screen, check the official page and fix this file in your pull request. The same list, grouped by person, is in `docs/R2_MANUAL_STEPS.md`.

## 0. Before you start

| Item | Why | Decision |
|---|---|---|
| Supabase paid plan (Pro) | Real students need daily backups (D-11) | YOU pay and choose |
| Vercel paid plan | The free Hobby plan is for non-commercial use (D-11) | YOU pay and choose |
| A domain name (for example `studentos.in`) | HTTPS address for students and for the email sender | YOU buy |
| An email sender (SMTP) | The built-in Supabase sender has a very low hourly limit and is not meant for real users | YOU pick one from `docs/PROVIDER_CHECK.md` |
| A team password manager | Keys and passwords must never be in Slack, GitHub or files | YOU |
| Who may touch production | Two people at most (the owner and R2) | YOU decide |

## 1. Supabase production project (YOU)

1. Create a new project named `studentos-production`. Region: closest to the students (for India, Mumbai). Set a strong database password and keep it in the password manager only.
2. Note the **project reference** (Project Settings, General).
3. Choose the **Pro plan** and check that daily backups are on (Project Settings, Database, Backups). Write the retention you see into `OPS_LOG.md`.
4. The only sign in providers are Email and (once you set it up, section 3) Google. Switch **off** phone sign in and anonymous sign ins, and every other provider.

## 2. Sign in settings (YOU, checked by `pnpm env:check`)

Authentication, then Sign In / Providers, then Email:

- Email provider **on**.
- **Confirm email: ON.** (Reason: with it off, anyone can create an account with an email they do not own, using the public sign up address. Since Day 9 the local stack runs with it on, and the sign in and join tests pass.)
- Email OTP length **6**, expiry **600** seconds.
- Email templates: open "Magic Link" and "Confirm signup" and paste the content of `supabase/templates/otp.html` into both (the code is `{{ .Token }}`).
- URL configuration: Site URL = the production address (step 5). The only redirect address to add is `https://<your address>/**`, and only for Continue with Google (section 3).
- Rate limits: keep the defaults, then raise "emails sent per hour" only after the custom sender (section 3) works.
- Do **not** turn on CAPTCHA protection yet: the app does not send the CAPTCHA token (decision for later, see `docs/R2_MANUAL_STEPS.md`).

## 3. Email sender (YOU)

1. Create an account with the sender provider chosen in `docs/PROVIDER_CHECK.md`.
2. Verify your sending domain: add the SPF, DKIM and DMARC records the provider shows to your domain's DNS. Wait until the provider says "verified".
3. In Supabase: Authentication, SMTP Settings, turn on custom SMTP and paste host, port, user, password and the sender address (for example `no-reply@studentos.in`).
4. Send yourself a sign in code and open it from a real mailbox (not a `.test` address). Check it is not in spam.

### Continue with Google (YOU, optional but recommended)

Needs a Google Cloud project. Do staging first, then production. Nothing here goes into git.

1. Open the Google Cloud console, create (or pick) a project named StudentOS. Under "APIs and services", "OAuth consent screen": user type External, app name StudentOS, your support email, your logo, the sign in domain `studentos.in`, and the links to your privacy and terms pages. Scopes: only `email`, `profile` and `openid` (they need no Google review).
2. "Credentials", "Create credentials", "OAuth client ID", type Web application. Under "Authorized redirect URIs" add exactly the callback shown in Supabase (Authentication, Sign In / Providers, Google; it looks like `https://<project-ref>.supabase.co/auth/v1/callback`). Save. Copy the client ID and the client secret.
3. In Supabase: Authentication, Sign In / Providers, Google: turn it on, paste the client ID and the secret, save. Under Authentication, URL Configuration, set Site URL to your site (`https://studentos.in`) and add `https://studentos.in/**` to Redirect URLs.
4. In Vercel: set `NEXT_PUBLIC_GOOGLE_SIGNIN` to `enabled` for that environment and redeploy (the button shows on the sign in page only then).
5. Check: open the sign in page in a private window, tap Continue with Google, choose an account. You must land in the app, signed in. Cancel once on purpose: you must come back to the sign in page with a plain message.
6. When the consent screen is ready for real users, press "Publish app" (from Testing to In production). While it is in Testing only the test users you list can sign in.

## 4. Vercel production site (YOU)

1. Import the GitHub repository as a **new** project named `studentos` (not the staging project). Production branch `main`, Node.js 24.x (24.15 or newer).
2. Attach your domain and wait for HTTPS to turn on.
3. Environment variables (Production):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | the production address, for example `https://studentos.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | production project, Project Settings, API, Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon (public) key of the **production** project |
| `SUPABASE_SERVICE_ROLE_KEY` | the service role key of the **production** project. Mark it sensitive. Server only |
| `APP_HASH_SECRET` | a **new** random secret of 32 or more characters. Different from local and staging. **Never change it later**: it is the key for the hashes of enrolment numbers and rate limit keys, and a new value makes the old hashes useless |
| `CRON_SECRET` | a new random secret of 24 or more characters (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
| `NEXT_PUBLIC_API_MOCKING` | `disabled` |

4. Do not deploy yet. The database comes first (section 5).

## 5. Push the database (YOU run, R2 prepared)

The migrations are in `supabase/migrations` and are the only way the database changes. **Never** run `supabase db reset` or load `supabase/seed.sql` on production: reset deletes everything and the seed adds fake people.

1. Take a snapshot first (Supabase, Database, Backups: a manual backup, or note the time of the last daily one).
2. On your computer (log in once with `pnpm supabase login`):
   ```
   pnpm supabase link --project-ref <production project reference>
   pnpm supabase db push --dry-run
   pnpm supabase db push
   ```
   The dry run lists the migrations that will be applied (all of `supabase/migrations`, 13 at the moment; the last one also creates the Global college, so there is nothing to do for Global). Read the list, then run the real push. It asks for the database password.
3. In the Supabase dashboard open Storage and check that a bucket `avatars` exists (migration `20261110000000`).
4. Deploy the Vercel project (Deployments, Redeploy). The server refuses to start if a setting is missing and the log names the setting.

## 6. First college and first admin (YOU run, R2 prepared)

There is no "create college" screen yet (ADM-01 is not built, see `docs/BACKEND_STATUS.md`). A college is created by a script:

1. The person who will run the college signs in once on the production site with their real email (the college email if they have one). That creates their account.
2. Open `supabase/production/create-college.sql`, copy it into the Supabase SQL editor (production project) and change only the values between the lines `EDIT` and `END EDIT`: slug (the address part), name, short name, city, state, colour, the college email domain(s), and the admin's email.
3. Run it. It stops with a clear message if the admin has not signed in yet or if the slug is taken. A test runs this exact script against a local database on every pull request (`tests/integration/production-scripts.test.ts`).
4. Open `https://<your address>/c/<slug>` and sign in as the admin. Create an invite code in the admin console or with `POST /api/v1/c/<slug>/admin/invites`.

## 7. Check it (R2 prepared, YOU run)

Put the production values in a file **outside the repository** (for example `C:\secrets\studentos-production.env`) with the names from `.env.example` and `CRON_SECRET`, then:

```
pnpm env:check --app https://<your address> --env C:\secrets\studentos-production.env --production
```

It prints PASS, WARN or FAIL for about 40 checks and ends with `READY` or `NOT READY`. It checks: the app is healthy and ready, security headers, HTTPS, sign in refuses other websites, the maintenance call is locked and works with the secret, anonymous visitors cannot read any private table or call any internal function, sign in settings (email on, **Confirm email on**), all 27 tables exist, the avatars bucket has the image types and the 2 MB limit, every active college has an active admin, and (with `--production`) that no sample people or colleges exist. Fix every FAIL before real students come. Keep the output with the release evidence.

Staging uses the same command without `--production`.

## 8. The scheduler (YOU, one time)

The workflow `.github/workflows/maintenance.yml` calls the maintenance endpoint every hour for staging and production. In the repository, Settings, Secrets and variables, Actions:

| Kind | Name | Value |
|---|---|---|
| Variable | `PRODUCTION_URL` | the production address |
| Secret | `PRODUCTION_CRON_SECRET` | the same value as the `CRON_SECRET` of the production site |
| Secret | `STAGING_CRON_SECRET` | the same value as the `CRON_SECRET` of the staging site (add that setting to the staging Vercel project too) |

Then Actions, Maintenance, Run workflow, and open the run: `HTTP 200` and the counts are printed. A target without settings is skipped, not failed.

## 9. Backups and the restore drill (YOU run with R5, R2 prepared)

Rules and numbers: `docs/BACKUP_AND_RELEASE_RUNBOOK.md` (RPO 24 hours, RTO 4 hours for the pilot). Before real students:

1. Create a scratch project `studentos-restore-test` (free plan is fine, it holds a copy only for the drill).
2. Restore the latest production backup into it (Supabase documents the steps for the plan you have).
3. Point a local copy of the app at it (a `.env` file outside the repository) and run `pnpm env:check --app http://localhost:3000 --env <that file>`, then `pnpm db:test` equivalents are not possible on hosted, so also check row counts of `colleges`, `memberships`, `audit_logs` against production.
4. Write the time it took (that is the real RTO) and the date into `OPS_LOG.md`. Delete the scratch project.

## 10. Go live checklist

- [ ] Sections 1 to 8 done, `pnpm env:check --production` says `READY`
- [ ] A real person signed in with a code from a real mailbox and joined with an invite code
- [ ] An admin approved a manual request and the applicant saw the notification
- [ ] Restore drill done and written in `OPS_LOG.md`
- [ ] `docs/RELEASE_CHECKLIST.md` S2 gates have evidence and the sign-off table is filled
- [ ] Two people know how to roll back (below) and who to call

## 11. Roll back and fix forward

- **App problem:** in Vercel open Deployments and promote the previous good deployment. Takes one minute. The database stays as it is, which is safe because every migration only adds things the old app ignores.
- **Database problem:** migrations are forward only. Fix with a **new** migration. If data was damaged, follow the restore procedure (RB-09) into a **new** project and compare before switching.
- **Leaked key or password:** revoke it in Supabase or Vercel at once, create a new one, update the settings, post in `#blockers` without the value. Rotating `SUPABASE_SERVICE_ROLE_KEY` and the database password is safe. Rotating `APP_HASH_SECRET` is not (section 4).

## 12. Everyday jobs

| Job | How |
|---|---|
| Add a college | section 6 (sign in once, run the script) |
| Make someone a moderator | the college admin changes the role in the admin console (ADM-09) |
| Look at what happened | admin console audit log (ADM-10); the Vercel logs show errors with a request id |
| Sign in mail not arriving | `docs/BACKUP_AND_RELEASE_RUNBOOK.md` RB-03: check the sender provider dashboard, the Supabase auth logs and the SMTP settings |
| A migration for a new feature | merged to `main`, then repeat section 5 (dry run, push) before deploying |
