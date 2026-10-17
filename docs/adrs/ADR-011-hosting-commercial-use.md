> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-011: Hosting plan must permit commercial use; Vercel Hobby only for non-commercial prototyping

| Field | Value |
|---|---|
| ID | ADR-011 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Vercel fair-use guidelines restrict Hobby to non-commercial personal use (verified 2026-10-15).

## Options considered
Vercel Pro; alternative host with commercial free tier; self-host.

## Decision
PROPOSED: prototype on Hobby; beta/production on a commercial-permitted plan (Vercel Pro or verified alternative) - team decision D-11.

## Reasons
Avoids terms violation and sudden suspension of a business product.

## Trade-offs and consequences
Cost (~$20/month per sources, verify) or migration effort.

## Revisit conditions
Cheaper compliant alternative verified; user volume changes economics.
