# How to contribute (simple rules)

1. Never push straight to `main`.
2. One task = one branch = one pull request (PR).
3. Branch name: `role/day-what` in lowercase. Examples: `r2/d3-invite-code`, `r4/d1-ui-foundation`.
4. Commit message: `r2 d3: add invite code check` (role, day, short sentence).
5. Before a PR: `git pull origin main` into your branch, then run `pnpm verify`. It must pass.
6. PR title: `[R2][D3] Add invite code join`. Fill in the PR template.
7. Ask the reviewer in Slack `#pull-requests`. Do not review your own PR.
8. After approval and green checks: Squash and merge, delete the branch, then `git checkout main` and `git pull`.
9. Never commit secrets, `.env` files, or real student data.
10. Every task needs a learning file and a progress update (see `docs/learning` and `docs/progress`).
11. If you did not finish a task today, write it in `docs/progress/CARRYOVER.md` and tell Slack. You continue tomorrow.
12. Tests: never say a test passed unless you ran it and saw it pass.

Reviewer map: R1 PRs are reviewed by R5. R2 by R5. R3 by R4. R4 by R3. R5 by R2. Anything about database, login, or permissions also needs R2 and R5 to look at it.
