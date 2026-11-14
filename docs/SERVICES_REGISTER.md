# Services register: providers and their terms

Written by R5 (Uday1217k) on 2026-11-15, Day 3. Rules: [LICENSING.md](LICENSING.md) section 7. Fields: service, plan, account owner, terms reviewed, data shared, DPA status.

R5 cannot see the admin's accounts. Anything that needs the account, the contract or a legal reading is marked **NOT VERIFIED** with the person who must confirm it. Prices and limits are in [PROVIDER_CHECK.md](PROVIDER_CHECK.md), read from official pages on 2026-10-18.

| Service | Used for | Plan | Account owner | Terms reviewed | Data shared | DPA status | Notes |
|---|---|---|---|---|---|---|---|
| Supabase | Database, sign in, file storage. Locally the same stack runs in Docker. | NOT VERIFIED. The staging project does not exist yet (carryover R5-D2-2). Free and Pro limits: PROVIDER_CHECK.md. | NOT VERIFIED (admin) | Pricing page read 2026-10-18. Terms and DPA not reviewed. | Everything the app stores: emails, profiles, posts, messages | Not reviewed (admin, with counsel) | Free projects pause after a week and have no automatic backups, so real student data needs Pro. |
| Vercel | Hosting and preview builds. A Vercel check appears on every pull request, so a project is connected. | NOT VERIFIED. If it is Hobby, it is for non-commercial use only (PROVIDER_CHECK.md, ADR-011). | NOT VERIFIED (admin) | Fair use page read 2026-10-18 | The built app and its logs | Not reviewed | Decision D-11 (hosting) is still open. Do not run a commercial pilot on Hobby. |
| GitHub (repository, Actions, Dependabot alerts) | Code, pull requests, CI | A private repository on a plan that cannot enable branch protection (HTTP 403 on 2026-10-18). 2,000 CI minutes a month per PROVIDER_CHECK.md. | manikanta7cheruku | Docs read 2026-10-18 | All source code | Not reviewed | Branch protection is carryover R5-D1-2. Dependabot reports 2 open alerts (1 moderate, 1 low) on the default branch. Nobody has looked at them yet. |
| Google sign in | "Continue with Google" (switched by `NEXT_PUBLIC_GOOGLE_SIGNIN`) | Not applicable | NOT VERIFIED (admin) | Not reviewed | Name, email and profile of the person signing in | Not reviewed | |
| Google Fonts via `next/font/google` | DM Sans and Bricolage Grotesque | Free | Not applicable | Font licences VERIFIED (see ASSETS_REGISTER.md) | Possibly the visitor's IP at build or load time. Not checked. | Not reviewed | Record in the privacy notice if Google serves the files to visitors. |
| Web Push (VAPID keys, browser push services) | Phone and desktop alerts | Free | Not applicable | Not reviewed | The device's push address and keys, and the alert text | Not reviewed | The private key lives only in server settings (`VAPID_PRIVATE_KEY`). |
| Email sender for login codes | One time codes | NOT VERIFIED. Locally a test mailbox is used. Production sender is undecided (D-11). Resend was read as a candidate only. | NOT VERIFIED (admin) | Pricing page read 2026-10-18 | The person's email address and the code | Not reviewed | Free plan has a 100 per day limit (PROVIDER_CHECK.md). |
| Docker Desktop | Runs the local Supabase stack on developer machines (installed on the R5 machine on 2026-11-14) | Free tier applies to personal use, education, non-commercial open source, and small businesses (fewer than 250 employees and under 10 million USD revenue). NOT re-verified on Docker's official page by R5 on 2026-11-15. | Each developer | Not reviewed | None (local tool) | Not applicable | The admin confirms the team qualifies, or buys seats. |
| Slack | Team messages and daily reports | NOT VERIFIED | NOT VERIFIED (admin) | Not reviewed | Team messages | Not reviewed | No app data should be posted there. |
| AI coding assistants (Claude, used by R5 in Day 3) | Drafting code, tests and docs, always reviewed by a person | NOT VERIFIED | The person using it | Not reviewed | Code and pasted command output | Not reviewed | Rules: docs/learning/AI_RULES.md. Never paste secrets or real student data. |
| Sentry, PostHog | Errors and product analytics | Not integrated: no setting for them in `.env.example` | Not applicable | Pricing read 2026-10-18 | Not applicable yet | Not applicable yet | Review terms and the DPA before adding them. |

## Open items

1. The admin fills in plan and account owner for Supabase, Vercel, Google sign in, the email sender and Slack.
2. Decision D-11 (hosting) and the email sender must be made before real student data is used.
3. DPA review for every service that receives personal data (admin, with counsel).
4. Someone reads the 2 Dependabot alerts on GitHub.
5. Confirm Docker Desktop's terms cover the team.
