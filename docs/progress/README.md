# Progress and carryover

Every role keeps its own progress records in its own folder. You edit only your own folder, so pull requests from different roles never change the same file.

## Role folders

| Role | Folder |
|---|---|
| R1 Product | `docs/progress/R1_product/` |
| R2 Backend | `docs/progress/R2_backend/` |
| R3 Frontend | `docs/progress/R3_frontend/` |
| R4 UI design | `docs/progress/R4_ui_design/` |
| R5 Testing and DevOps | `docs/progress/R5_qa_devops/` |

In other docs, `<role-folder>` means the folder of your own role from this table.

Each role folder has the same three items:

| Item | What it holds | When you update it |
|---|---|---|
| `PROGRESS.md` | One row per task of that role. Status: Not started, In progress, In review, Blocked, Done | at the end of each task and each day |
| `CARRYOVER.md` | One row per task not finished on its day. Fill the "Done on" column when it is finished | when a task slips, and when it is finished |
| `daily/` | One daily report per day, named `D01_R2.md` (day number, role number). Use the template in `REPORT_TEMPLATES.md` | once per day |

Shared files in this folder: this README and `REPORT_TEMPLATES.md`. They change only through a pull request that is announced in Slack `#changes`.

## Naming

- Daily report: `D01_R2.md`. Two digits for the day, then the role number. Example: `docs/progress/R2_backend/daily/D03_R2.md`.
- Do not create a daily report for a day that has not happened. A role folder starts with empty tables and an empty `daily/` folder.
- The column layout of `PROGRESS.md` and `CARRYOVER.md` is the same for every role. Keep it. The Role column stays, so rows can be compared across roles.

## Rules

1. Edit only your own role folder. If a record of another role is wrong, tell that role in Slack `#changes`.
2. "Done" means the task passed `docs/DEFINITION_OF_DONE.md`, including tests you really ran.
3. Add new rows at the end of the table. Never delete or rewrite old rows. To change a status, edit that task's own row.
4. A task has one row in `PROGRESS.md`. A task that slips also gets one row in `CARRYOVER.md`. Do not copy a row into another role's files.
5. Slack points to these files. These files are the truth about progress.

## Seeing the whole team at once

There is no combined file to edit by hand, because that would bring the conflicts back. To read all role boards, run this in PowerShell from the repository root:

```
Get-ChildItem docs\progress -Recurse -Filter PROGRESS.md | ForEach-Object { "== $($_.FullName)"; Get-Content $_.FullName }
```

Use `CARRYOVER.md` in the same command to see everything that slipped.

## If two branches conflict in your own file

This only happens when two of your own branches both added rows. Open the file, keep both sets of rows (never delete a row), keep the table header and the separator line once, order the rows by day, save, then `git add` and `git commit`. Run `pnpm verify` before you push.
