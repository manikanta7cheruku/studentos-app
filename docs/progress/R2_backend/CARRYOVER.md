# Carryover (tasks not finished on their day) - R2 Backend

Only R2 Backend tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

If you did not finish a task today, add a row. Continue it first thing next day. Tell Slack `#daily-reports`.

| Date | Day | Role | Task ID | What is left | Why not finished | Needs help from | Done on |
|---|---|---|---|---|---|---|---|
| 2026-10-31 | 1 | R2 | R2-D1-1 | Independent review of the RLS policies and grants. PR #10 is already merged, so any finding becomes a follow-up PR. Learning walkthrough drill | AI rule 7: security SQL needs a human second review. The author must not review their own PR | R5 or another teammate who is not the author | |
| 2026-10-31 | 1 | R2 | R2-D1-2 | R3 confirms they can read the contracts and fixtures. R4 checks their Day 3 and Day 4 sample data against src/contracts/fixtures | Waiting for R3 and R4. This task's done-when needs R3's confirmation | R3, R4 | |
| 2026-10-31 | 2 | R2 | R2-D2-1 | Independent review of the login, rate limit and cookie code. Check the hosted Supabase project has the 6 digit code template, 10 minute expiry and mail limits. Try the sign in by hand in a browser once R3 has the screens | AI rule 7: security code needs a second human review. Hosted settings are the staging task of R5. No sign in screen yet | R5 (staging settings), a reviewer who is not the author, R3 (screens) | |
| 2026-10-31 | 2 | R2 | R2-D2-2 | Independent review of the join SQL and routes. Checkpoint 1 on staging: sign in, join with invite code and college email, pending screen. Clean up unused Supabase accounts created by the college email proof (decide with R5) | Staging and the sign in and join screens do not exist yet. Review needs a second person | R3 (screens), R5 (staging, Playwright), a reviewer who is not the author | |
