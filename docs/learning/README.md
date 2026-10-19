# Learning records

Every task gets a learning file. Every role keeps its learning files and its learning index in its own folder, so pull requests from different roles never change the same file.

## Folders

| Role | Folder | Index of its learning files |
|---|---|---|
| R1 Product | `docs/learning/R1_product/` | `docs/learning/R1_product/INDEX.md` |
| R2 Backend | `docs/learning/R2_backend/` | `docs/learning/R2_backend/INDEX.md` |
| R3 Frontend | `docs/learning/R3_frontend/` | `docs/learning/R3_frontend/INDEX.md` |
| R4 UI design | `docs/learning/R4_ui_design/` | `docs/learning/R4_ui_design/INDEX.md` |
| R5 Testing and DevOps | `docs/learning/R5_qa_devops/` | `docs/learning/R5_qa_devops/INDEX.md` |

In other docs, `<role-folder>` means the folder of your own role from this table.

Other items in `docs/learning/`:

| Item | What it is |
|---|---|
| `LEARNING_INDEX.md` | The central catalogue. It explains what a complete learning file is and points to the five role indexes. You do not add rows to it |
| `templates/_TEMPLATE.md` | The template to copy for every learning file |
| `templates/_EXAMPLE.md` | A fake example that shows the depth expected |
| `AI_RULES.md` | Rules for AI-assisted work |

## Naming

- Learning file: `D01_R2_<topic>.md` inside your role's `build-sessions/` folder. Day number with two digits, role number, then a short topic in lowercase with hyphens. Example: `docs/learning/R2_backend/build-sessions/D03_R2_admin-api.md`.
- Copy `docs/learning/templates/_TEMPLATE.md` and fill it in. Do not edit the template itself without announcing it in Slack `#changes`.

## After every merge

Add one row at the end of the table in your own role index (`docs/learning/<role-folder>/INDEX.md`). Fill the "Walkthrough passed by" column only after a teammate passed the walkthrough drill.

## Why the index is split by role

One shared index would be edited by all five roles in almost every pull request, and every pull request would conflict with the others. One index per role means each role edits only its own file. The central `LEARNING_INDEX.md` is a stable catalogue that changes only when the structure changes.

## If two branches conflict in your own index

Keep both sets of rows (never delete a row), keep the table header and separator line once, order the rows by day, then commit.
