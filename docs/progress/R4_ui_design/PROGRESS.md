# Progress board - R4 UI design

Only R4 UI design tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

Everyone updates their own rows at the end of each task and each day. Status: Not started, In progress, In review, Blocked, Done.
"Done" means it passed the Definition of Done (docs/DEFINITION_OF_DONE.md), including tests you really ran.

| Day | Role | Task ID | Task | Status | PR link | Tests run (what you saw) | Learning file | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | R4 | R4-D1-1 | UI foundation (tokens, fonts, base parts, sandbox page) | In review | https://github.com/manikanta7cheruku/studentos-app/pull/4 | pnpm test: 6 files, 32 tests passed. pnpm verify: all 5 steps passed. Lighthouse Accessibility (Chrome, Mobile): 100. Two planted failures made tests fail, then removed | docs/learning/R4_ui_design/build-sessions/D01_R4_ui-foundation.md | Merged to main on 2026-10-29 with no reviewer (R3 is not a repo collaborator yet). pnpm verify on main after the merge: all 5 steps passed, 32 tests. Post-merge review requested from R3. Tab key and widths 360, 768 and 1280px checked by hand: no problems |
| 1 | R4 | R4-D1-2 | Learning folder habit | In progress | not started | Checked with ls: only R5 has learning files. R1, R2, R3 folders were empty on main | none | Rule not posted in Slack #learning yet. R4 learning file is in PR #4 |
