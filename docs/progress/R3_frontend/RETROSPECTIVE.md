# Retrospective, R3 Frontend

Written 2026-11-10 by R3 (project owner takeover).

## What went well
- **Real backend from the first screen.** Typed calls validated by the same contracts as the server meant that a contract mistake (the invite `created_by`) showed up in a browser test and not in front of a student.
- **Browser tests that act like a person** (two students, two windows) found real bugs that unit tests could not: a full page load needed after sign in, a missing Idempotency-Key, a broken label.
- **Small shared parts** (`useLoad`, `usePaged`, `useAttempt`, `LoadError`, `PageHeader`) made the screens consistent and quick to build.
- **Docs written with the code**, including a table of problems we met on the way.
- **Decisions in writing** (D-25 to D-27): Global as a normal space avoided a risky cross-college rule.

## What went badly
- **The first R3 Days 1 to 3 were reported "ready" but never reached GitHub**, and the screens used sample data. Progress rows must link a PR.
- **Work pushed after a merge was lost twice** (the docs fix, the Coming soon switch). Push to a branch whose PR is still open, or open a new PR.
- **CI only runs for PRs aimed at `main`**: stacked PRs looked tested and were not. Retarget and reopen.
- **Secrets setup cost days**: token permissions, the IPv6 database address, a placeholder left in a secret. Everything is now in docs/STAGING_SETUP.md.
- **One person did everything.** No independent review, which the project's own rules require.
- **Temporary files and screenshots** leaked into the repo twice.

## What to change next time
1. Never mark a task Done without a link to a merged PR **and** a reviewer's name.
2. Open the PR first, then keep adding commits to that branch until it merges.
3. Run every new journey on staging with a real phone before the day is closed.
4. Keep scratch files outside the project folder.
5. Add an automated accessibility scan (axe) to the browser tests.

## Next phase (suggested order)
1. Review by R2 and R5, then fix what they find.
2. Real phone and staging click-through of Days 5 to 8.
3. Domain, email sender, Supabase Pro, Vercel Pro, production, restore drill.
4. A closed beta in one college (invite codes). Watch it for two weeks. Talk to 10 students.
5. Then: the landing page rewritten around what students actually use, projects and portfolio (Day 4), the "my teams" page, blocks on screens, edit roles of a post.
