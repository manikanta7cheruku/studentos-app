# Carryover (tasks not finished on their day) - R4 UI design

Only R4 UI design tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

If you did not finish a task today, add a row. Continue it first thing next day. Tell Slack `#daily-reports`.

| Date | Day | Role | Task ID | What is left | Why not finished | Needs help from | Done on |
|---|---|---|---|---|---|---|---|
| 2026-10-29 | 1 | R4 | R4-D1-1 | Post-merge review of PR #4 by R3. Learning file gaps: read every component file, Lighthouse with dialog open, walkthrough drill | PR #4 merged without review because R3 has no repo access yet | R3: review of PR #4 and repo access | |
| 2026-10-29 | 1 | R4 | R4-D1-2 | R1, R2, R3 need a first learning file (learning rule already posted in Slack #learning) | Other roles own their own files | R1, R2, R3: write first learning file | |
| 2026-10-31 | 4 | R4 | R4-D4-2 | Landing LCP 4.1 s (target 2.5 s) and JS+CSS 236 KB gz (budget 150 KB). Identify the LCP element and two unidentified chunks. Swap the stand-in for WL-01 and re-check one row per email | Most weight is shared framework baseline; budget may be unrealistic for this stack | R3: decision on the 150 KB budget. R2: WL-01 merged | |
| 2026-10-30 | 3 | R4 | R4-D3-1 | Wire ADM-06 and ADM-07 to the real API, admin can approve a person on staging, E2E check with R5 | Screens use sample data. R2 admin API (R2-D3-1) not merged yet, staging and E2E depend on it | R2: admin endpoints. R5: E2E check. R3: review of PR 9 | |
| 2026-11-05 | 5 | R4 | R4-D5-1 | R3 to use the parts in the Team Finder screens (done-when), then merge after review | R3 has not started using them yet | R3: review and use the parts | |
| 2026-11-05 | 5 | R4 | R4-D5-1 | By-hand checks: Escape on the phone filter sheet, focus return to the Filters button, VoiceOver on the role picker | Not done yet | none | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | Add to tracker against the real backend. The button posts to /me/applications, which is not on the backend. The 2 tracker tests pass only against a mock | Route does not exist, tracker is R3's | R3 and R2: tracker route | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | Expired card still shows Apply, Save and Add to tracker. Decide if they should stay | Design decision | R3 and team | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | With Career switched off the screen still shows the filters and a Retry button that cannot help | Polish, not done | none | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | Search sends a request on every keystroke (no debounce). Filter button label is cut to 'Filter opportuni...' at 360px | Polish, not done | none | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | Career page text still says Opportunities is coming, although the screen exists. Wording is R3's | R3's file | R3 | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | Server-side filtering has no automated test (the mock returns one fixed list). Checked by hand only, reported, no screenshots | Mock cannot filter | none | |
| 2026-11-08 | 7 | R4 | R4-D7-1 | Checkpoint 4 on staging not confirmed. Many manual checks are reported without screenshots | Not done | R5 | |
