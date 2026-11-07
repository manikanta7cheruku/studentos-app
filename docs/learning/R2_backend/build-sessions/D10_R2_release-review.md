# Release review and retrospective - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D10-1 / none / https://github.com/manikanta7cheruku/studentos-app/pull/36 |
| Related docs | docs/progress/R2_backend/RELEASE_REVIEW.md, docs/progress/R2_backend/RETROSPECTIVE.md, docs/RELEASE_CHECKLIST.md |

## 1. What we are learning and why it is needed

Before real students use a system, someone has to say, with evidence, what works, what was never proven, and what must happen first. And after ten days, the team should write down what to repeat and what to change. This task does both for the backend.

## 2. What problem it solves

- The release decision has facts to stand on: a gate by gate table, test totals, a security log, an audit of dependencies and licences, and a list of limits.
- It separates "proven by a command that was run" from "claimed", and from "not done because only a person can do it".
- The retrospective keeps the lessons (for example "mocked tests hid a broken feature") in the project instead of in one head.

## 3. Concepts and terminology (short glossary)

- Release gate: a line of the release checklist that needs evidence (a run link, a report) before a stage can start.
- Go, Delay, Narrow: the three possible decisions (start, wait, or start with a smaller scope).
- Dependency audit: asking the package registry which installed packages have known weaknesses.
- Secrets scan: searching all tracked files for keys, tokens and private keys.
- Retrospective: a written look back at what went well, what went wrong and what to change.

## 4. How it works internally (appropriate depth)

1. Collect facts by running commands on the merged code: the three test suites, the build, the environment check, `pnpm audit --prod`, `pnpm licenses list --prod`, a `git grep` for secret patterns, a count of endpoints, tables, functions and migrations.
2. Map the R2 owned lines of `docs/RELEASE_CHECKLIST.md` to evidence or to the person who owns the missing part.
3. Roll up every open carryover row into one list of actions by owner.
4. Write the recommendation for each stage (S1, S2, S3) in plain words.
5. Write the retrospective from the daily files and the surprises caught on each day.

## 5. How it is used in StudentOS (files/modules)

`docs/progress/R2_backend/RELEASE_REVIEW.md`, `docs/progress/R2_backend/RETROSPECTIVE.md`, `docs/R2_MANUAL_STEPS.md`.

## 6. Request/response and data flow (diagram or numbered trace)

Not an API task. The flow is: run the checks, write the findings, hand the list to the people who must act, and keep the records in the repository.

## 7. API methods, endpoints, schemas, status codes

None.

## 8. Database changes and relationships

None.

## 9. Authentication / authorization behaviour

None changed. The review lists the controls that exist.

## 10. Errors and edge cases

- The dependency audit shows two findings in the `shadcn` package tree (a CLI). They are not in code that handles requests, so the review records them as low risk, owned by R5.
- Two licences need entries in the licensing register (an image library binary with LGPL and a data package with CC-BY).
- The review cannot claim anything about the hosted services; it says so.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm test
pnpm db:test
pnpm test:integration
pnpm audit --prod
pnpm licenses list --prod
pnpm env:check --app http://localhost:3000 --env .env.local
```

The results are in section 3 of the release review.

## 12. How to debug common failures

- `pnpm audit` cannot reach the registry: run it later or from another network; the review is not valid without it.
- A number in the review does not match your run: the review states the date and the code version; rerun and update.

## 13. Security considerations

The review does not print any secret. The secrets scan covers tracked files only; ignored files such as `.env.local` are not in the repository.

## 14. Alternatives and trade-offs

- A review by the author is faster but less trusted than one by another person. This one says so at the top and lists the independent reviews that must still happen.
- A single long checklist versus separate documents: one review file plus one retrospective keeps decisions and lessons apart.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) ran the commands, wrote the review and the retrospective from the daily files and the test output, and wrote the owner list. The recommendation is the author's view, not a decision.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: all suites, the audit, the licence list, the secrets scan, the counts.

Not done yet (open on purpose): the owner has not read or signed the review, and nobody else has reviewed the code.

## 17. What each teammate can now explain/implement independently

R1: use the gate table for the go or wait checklist. R5: repeat the scans and own the update of the two dependency findings. The owner: take the actions in section 7 of the review.
