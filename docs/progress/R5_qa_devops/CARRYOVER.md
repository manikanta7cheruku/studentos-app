# Carryover (tasks not finished on their day) - R5 Testing and DevOps

Only R5 Testing and DevOps tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

If you did not finish a task today, add a row. Continue it first thing next day. Tell Slack `#daily-reports`.

| Date | Day | Role | Task ID | What is left | Why not finished | Needs help from | Done on |
|---|---|---|---|---|---|---|---|
| 2026-10-18 | 1 | R5 | R5-D1-2 | Turn on branch protection for main | GitHub cannot enable it on a private repo on our current plan (HTTP 403) | Admin: decide GitHub Pro or keep the team rule; add R2 as collaborator; real names in CODEOWNERS | |
| 2026-10-31 | 2 | R5 | R5-D2-2 | Create the Supabase staging project and the Vercel staging project, set the hosted Auth settings and the email sender, add the GitHub secrets and variables, run the staging workflow once with seed, run the smoke test. Steps: docs/STAGING_SETUP.md | These need the owner's own accounts and secrets. R5 cannot create accounts or paste secrets | Admin (accounts, secrets), decision D-11 for the email sender | |
| 2026-10-31 | 2 | R5 | R5-D2-3 | Checkpoint 1 on staging: sign in, join with invite code and college email, pending screen, with R2 and R3. Browser journeys for the real screens. Upload the Playwright report in CI | Staging does not exist yet and R3 has not built the sign in and join screens | R3 (screens), R2, Admin (staging) | |
| 2026-10-31 | 2 | R5 | R5-D2-1 | Independent review of the permission matrix against docs/AUTH_AND_TENANCY.md section 4. Add the Day 3 admin endpoints to the matrix when R2 merges them | A second person has not looked yet. The endpoints do not exist yet | A reviewer who is not the author, R2 | |
| 2026-11-15 | 3 | R5 | R5-D3-1 | The 4 pending licence exceptions in licenses.exceptions.json must be approved (name and date) or removed. After that run pnpm licenses:check --strict before the S2 gate. | R5 can propose but not approve (docs/LICENSING.md section 4.3) | R2 or admin | |
| 2026-11-15 | 3 | R5 | R5-D3-1 | Generate THIRD_PARTY_NOTICES.txt at build and link it from the legal page (LICENSING.md section 4.3 item 3). caniuse-lite (CC-BY-4.0) needs its attribution there. | Not started: needs a decision on where it is built and shown | R2 (build), R3 and R4 (legal page) | |
| 2026-11-15 | 3 | R5 | R5-D3-1 | Fill the NOT VERIFIED cells in docs/ASSETS_REGISTER.md and docs/SERVICES_REGISTER.md (who made the logo and icons, plans, account owners, DPA status). R4 decides about the unused Fraunces and Public Sans fonts. Delete the five unused starter SVG files. | These need the owner's accounts and knowledge | Admin, R4 | |
| 2026-11-15 | 3 | R5 | R5-D3-1 | Independent review of PR #64. Update docs/TESTING.md and docs/CI_CD_AND_ENVIRONMENTS.md for the Licence check, the Secret scan, the contract coverage test and the new journeys. Give R2 the finding about the announcements speed check (no table statistics right after 4000 inserted rows) | A second person has not looked yet. The docs follow-up was not done today | R2 | |
