# Slack report templates (copy, fill, post)

## Start of day (post in #daily-reports)
```
START | R2 | Day 3
Carryover from yesterday: (none or list)
Today I will do: R2-D3-1 (admin API)
Branches: r2/d3-admin-api
Need from others: (none or who and what)
Blockers: (none or list)
```

## End of day (post in #daily-reports)
```
END | R2 | Day 3
Done: R2-D3-1 (PR #12 merged)
Not done (moved to carryover): (none or list and why)
Tests I ran and saw pass: pnpm verify, pnpm db:test
Learning file: docs/learning/R2_backend/build-sessions/D03_R2_admin-api.md
Progress file updated: yes
Things that affect others: (contract changes, new env vars, new commands)
Tomorrow: R2-D4-1, R2-D4-2
Help needed: (none or list)
```

## Pull request (post in #pull-requests)
```
PR | R2 | Day 3 | r2/d3-admin-api
Link:
What it does (one line):
How to test (steps):
Reviewer: R5
```

## Blocker (post in #blockers)
```
BLOCKED | R3 | Day 5
Task: R3-D5-1
What is stuck:
Since when:
What I tried:
Who can help:
```

## Change that affects others (post in #changes)
```
CHANGE | R2 | Day 4
What changed (contract, table, env var, command):
Files:
Who must react and by when:
```
