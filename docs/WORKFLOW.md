# Workflow (simple)

## Branch names
`role/day-what` in lowercase, with dashes. Examples:
- `r1/d2-interview-notes`
- `r2/d3-admin-api`
- `r3/d5-team-finder-ui`
- `r4/d1-ui-foundation`
- `r5/d1-scaffold-ci`
If you have two tasks in a day, use two branches.

## The loop for every task
1. `git checkout main` and `git pull origin main`
2. `git checkout -b r2/d3-admin-api`
3. Work in small steps. Commit often: `git add .` then `git commit -m "r2 d3: add invite create endpoint"`
4. `git push -u origin r2/d3-admin-api` (first time)
5. Open a Draft PR on GitHub early.
6. Before asking for review: `git pull origin main` (fix conflicts), run `pnpm verify`.
7. Mark the PR "Ready for review". Post in Slack `#pull-requests`: PR link, what it does, how to test.
8. Reviewer reads the code, runs it if the change is big, and writes comments (blocker, suggestion, or question). First answer within 4 working hours.
9. Author fixes comments. Reviewer approves.
10. When checks are green and approved: Squash and merge. Delete the branch.
11. `git checkout main` and `git pull`.
12. Write the learning file. Update progress. Post the end of day report in Slack.

## Who edits what
See `.github/CODEOWNERS`. If you need to change a shared thing (database, contracts, UI kit, CI) that is not yours:
1. Post in `#changes` first: what and why.
2. Ask the owner. The owner says yes and who goes first.
3. Keep the change small and merge fast.

## Conflicts
The person who started first merges first. The second person pulls main, fixes the conflict, and asks the first person for a quick check. For database or API disputes R2 decides after a 15 minute call.

## Contract changes
Change `src/contracts` and `docs/API_CONTRACT.md` and sample data in the same PR. Tag R2 and everyone who uses it. After merge, users update in the same day.

## Unfinished work
Hidden behind a feature flag. Listed in `docs/progress/<role-folder>/CARRYOVER.md`.

## Release
Only through `docs/RELEASE_CHECKLIST.md`. Security, college isolation, data safety, and a tested restore cannot be skipped.

## Disagreements
Talk for 20 minutes. Try to agree. If not, vote (majority). The owner of the area breaks a tie. Security and isolation checks are not voted on.
