# Carryover (tasks not finished on their day) - R5 Testing and DevOps

Only R5 Testing and DevOps tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

If you did not finish a task today, add a row. Continue it first thing next day. Tell Slack `#daily-reports`.

| Date | Day | Role | Task ID | What is left | Why not finished | Needs help from | Done on |
|---|---|---|---|---|---|---|---|
| 2026-10-18 | 1 | R5 | R5-D1-2 | Turn on branch protection for main | GitHub cannot enable it on a private repo on our current plan (HTTP 403) | Admin: decide GitHub Pro or keep the team rule; add R2 as collaborator; real names in CODEOWNERS | |
| 2026-10-31 | 2 | R5 | R5-D2-2 | Create the Supabase staging project and the Vercel staging project, set the hosted Auth settings and the email sender, add the GitHub secrets and variables, run the staging workflow once with seed, run the smoke test. Steps: docs/STAGING_SETUP.md | These need the owner's own accounts and secrets. R5 cannot create accounts or paste secrets | Admin (accounts, secrets), decision D-11 for the email sender | |
| 2026-10-31 | 2 | R5 | R5-D2-3 | Checkpoint 1 on staging: sign in, join with invite code and college email, pending screen, with R2 and R3. Browser journeys for the real screens. Upload the Playwright report in CI | Staging does not exist yet and R3 has not built the sign in and join screens | R3 (screens), R2, Admin (staging) | |
| 2026-10-31 | 2 | R5 | R5-D2-1 | Independent review of the permission matrix against docs/AUTH_AND_TENANCY.md section 4. Add the Day 3 admin endpoints to the matrix when R2 merges them | A second person has not looked yet. The endpoints do not exist yet | A reviewer who is not the author, R2 | |
