# Progress board - R5 Testing and DevOps

Only R5 Testing and DevOps tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

Everyone updates their own rows at the end of each task and each day. Status: Not started, In progress, In review, Blocked, Done.
"Done" means it passed the Definition of Done (docs/DEFINITION_OF_DONE.md), including tests you really ran.

| Day | Role | Task ID | Task | Status | PR link | Tests run (what you saw) | Learning file | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | R5 | R5-D1-1 | Project scaffold and CI | Done | https://github.com/manikanta7cheruku/studentos-app/pull/1 | pnpm verify passed locally; clean clone passed install --frozen-lockfile and verify; deliberate failing test made CI fail; CI on main passed after merge (34s) | docs/learning/R5_qa_devops/build-sessions/D01_R5_scaffold-ci.md | Merged with no recorded GitHub approval because no reviewer collaborator exists yet. Final Done when this docs PR merges |
| 1 | R5 | R5-D1-2 | Protect the main branch | Blocked | none | gh api branches/main/protection returned HTTP 403: Upgrade to GitHub Pro or make this repository public | docs/learning/R5_qa_devops/build-sessions/D01_R5_branch-protection.md | Team rule in force: nobody pushes to main. Admin must decide GitHub Pro or keep the team rule |
| 1 | R5 | R5-D1-3 | Check provider pages | In review | this docs PR | none (research task). Check: every row has an official link | docs/learning/R5_qa_devops/build-sessions/D01_R5_provider-check.md | Open items for admin are in docs/PROVIDER_CHECK.md |
