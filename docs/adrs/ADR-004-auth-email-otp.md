> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-004: Authentication with Supabase Auth email OTP/magic link; no passwords; phone OTP not identity proof

| Field | Value |
|---|---|
| ID | ADR-004 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Students lack consistent institutional emails; passwords add reset flows and risk.

## Options considered
Passwords; Google OAuth; phone OTP; email OTP.

## Decision
Email OTP/magic link in v1; Google sign-in considered later.

## Reasons
No password storage; simple; supports any email provider; matches RLS integration.

## Trade-offs and consequences
Depends on email deliverability; shared inboxes; SMS excluded (cost/regulation).

## Revisit conditions
OTP deliverability poor in pilot; colleges demand SSO.
