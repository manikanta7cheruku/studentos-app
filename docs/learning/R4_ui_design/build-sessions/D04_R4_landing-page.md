# Landing page and waitlist form - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D4-2 / ADR-009 (UI primitives) / #16 |
| Related docs | docs/LANDING_PAGE.md, docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md, docs/API_CONTRACT.md (WL-01) |

## 1. What we are learning and why it is needed
The landing page at `/` tells students and college staff what StudentOS is and collects waitlist signups. The waitlist is the page's one goal, so the form, its errors and its consent checkbox matter most. The spec says to use real words and no fake numbers, quotes or logos.

## 2. What problem it solves
Without a public page there is nowhere to send a college or a student who asks "what is this?". Without a consent checkbox we could not lawfully contact the people who sign up. A slow or confusing page on a phone loses visitors before they reach the form.

## 3. Concepts and terminology (short glossary)
- **Waitlist (WL-01)**: the endpoint `POST /api/v1/waitlist` that stores one lead.
- **Contract**: the Zod schema `waitlistBody` in `src/contracts/engagement.ts`. It is the agreed shape of the request.
- **strictObject**: a Zod schema that rejects any extra field, so the form must send exactly the contract fields.
- **Honeypot**: a hidden field real users never fill. A bot that fills it is shown fake success and nothing is sent.
- **Idempotent**: sending the same request twice gives the same result and does not create a second row.
- **Stand-in (mock)**: temporary code that behaves like the real endpoint until the real one exists.
- **LCP / CLS / TBT**: Lighthouse speed measures. LCP is when the biggest thing appears, CLS is how much the layout jumps, TBT is how long the page is blocked.
- **axe**: the automatic accessibility checker run inside tests.

## 4. How it works internally (appropriate depth)
- `src/app/page.tsx` is a server component with the sections: hero, problem, what you can do, trust, how it starts, for colleges, FAQ, waitlist, footer. Only the FAQ accordion and the form run client code.
- `WaitlistForm` (`src/features/waitlist/waitlist-form.tsx`) keeps field values in state. On submit it checks the honeypot first, then validates, then builds a payload with only the contract fields (`college_name`, `contact_name`, `contact_email`, `role`, `consent: true`, `source: "landing"`). The audience toggle (student or staff) only changes labels and role options. It is never sent.
- Email is checked with the contract's own email rule, so the form and the server agree on what "valid" means.
- `submitWaitlist` (`src/features/waitlist/submit.ts`) is a stand-in. It parses the input with `waitlistBody`, waits 50 ms, and remembers email + college in an in-memory Set. A repeat returns success again without storing twice.
- The server, not the form, stamps `consent_at`, so the form never sends a timestamp.
- Five draft pages (`/privacy`, `/terms`, `/contact`, `/safety`, `/colleges`) exist so the footer and the consent link do not return 404. They hold no legal text.

## 5. How it is used in StudentOS (files/modules)
- `src/app/page.tsx` (landing page), `src/app/{privacy,terms,contact,safety,colleges}/page.tsx` (drafts)
- `src/features/waitlist/waitlist-form.tsx`, `src/features/waitlist/submit.ts`
- `src/features/landing/faq-accordion.tsx`
- Shared parts reused from `src/components/ui`: Button, FormField, Input, Select, CheckboxField, ErrorSummary
- Contract: `waitlistBody` and `waitlistResponse` in `src/contracts/engagement.ts`
- Tests: `tests/ui/waitlist-form.test.tsx`, `tests/a11y/landing.test.tsx`

## 6. Request/response and data flow (diagram or numbered trace)
1. The visitor fills the form and presses Join the waitlist.
2. The form checks the honeypot, then validates each field.
3. If anything is wrong, an error summary and field errors show, input is kept, and nothing is sent.
4. If valid, the form builds the contract payload and calls `submitWaitlist`.
5. Today `submitWaitlist` is the in-memory stand-in and returns `{ data: { joined: true }, meta: { request_id } }`.
6. The form replaces itself with "You're on the waitlist".
7. Later, step 5 becomes a real `POST /api/v1/waitlist` from R2 (WL-01).

## 7. API methods, endpoints, schemas, status codes
- WL-01: `POST /api/v1/waitlist`, public (no sign in).
- Request: `waitlistBody`: `college_name` (1 to 120), `contact_name` (1 to 120), `contact_email`, `role` (student, faculty, college_admin, other), `consent` (must be `true`), `source` (optional, up to 40).
- Response: `{ data: { joined: true } }` inside the success envelope.
- The real endpoint is not on main yet. A `curl` to `/api/v1/waitlist` on my machine returned 404, so the form could not have been talking to a real route. The error status codes will come from R2.

## 8. Database changes and relationships
None from R4. R2 owns the waitlist table. The spec says one lead per email and college, kept 12 months.

## 9. Authentication / authorization behaviour
The endpoint is public, so there is no sign in and no college isolation to check. The server must validate the body and rate-limit by IP (spec: 5 per hour). The form checks are only for the visitor's convenience.

## 10. Errors and edge cases
- Invalid or empty email shows an error and nothing is sent.
- No consent: the form refuses and shows an error.
- The honeypot is filled: fake success and nothing is sent.
- The same email twice: success both times, one stored lead (verified on the stand-in only).
- The audience changes after a role was picked: a role that no longer fits is cleared.
- The real endpoint fails or is rate-limited: not handled nicely yet. The form shows the raw error message. A friendlier message is still to do when WL-01 is wired.

## 11. Tests: what exists and how to run them (exact commands)
- `pnpm test` runs everything (177 tests in 11 files on 2026-10-31).
- `pnpm test waitlist` runs `tests/ui/waitlist-form.test.tsx` (7 tests): AC-WL-01 invalid email blocked, AC-WL-02 same email twice, AC-WL-03 no consent refused, AC-WL-04 keyboard-only and errors announced, input kept after a failed submit, audience toggle not sent, honeypot sends nothing.
- `tests/a11y/landing.test.tsx` (3 tests): one h1 and no serious or critical axe problems.
- `pnpm verify` runs format, lint, typecheck, tests and build. It passed on 2026-10-31.
- Lighthouse: `pnpm build && pnpm start`, then `npx lighthouse http://localhost:3000 --only-categories=performance,accessibility,seo --view`.

## 12. How to debug common failures
- Form shows success but nothing is saved: check `submit.ts`. It is the stand-in, so nothing is stored anywhere.
- A `curl` to the endpoint returns 404: the route does not exist on this branch.
- `EADDRINUSE` on port 3000: an old dev server is still running. Stop it with `lsof -ti :3000 | xargs kill -9`.
- Lighthouse scores look bad: make sure it runs against `pnpm start`, not `pnpm dev`.
- `git pull` says "divergent branches": run `git config pull.rebase false`, then pull again.

## 13. Security considerations
- The form must send only contract fields. `strictObject` makes the contract reject extras.
- No secrets and no real student data are in the page or the tests. Test emails are made up.
- The server must do the real validation, rate limiting and the `consent_at` timestamp. The form is not a security control.
- The honeypot is a cheap bot filter, not protection against a determined attacker.
- Placeholder pages contain no legal wording. R1 and counsel own that text.

## 14. Alternatives and trade-offs
- Wait for R2's endpoint, or build against the contract with a stand-in. I built the stand-in so the form and tests are not blocked, and I marked it with a TODO.
- Validate in the browser only, or also against the shared schema. I reuse the contract's email rule so the form and server agree.
- Cards everywhere, or rules and whitespace. Boxes made the page look flat, so sections use thin rules and a number column.

## 15. What AI generated or suggested (prompts used, summary)
AI helped write the page sections and layout, the form, the stand-in, the test ideas, the placeholder pages and this file. I told it the task and spec, pasted my real terminal output, and asked for small changes.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- I ran `pnpm verify` and read the output. It passed, 177 tests in 11 files, build ok with all routes listed.
- I ran `curl` against `/api/v1/waitlist` and got 404, which showed the real endpoint does not exist yet.
- I read `submit.ts` and `waitlist-form.tsx` and checked the payload against `waitlistBody`.
- I looked at the page in the browser and rejected a first redesign that looked bad.
- I ran Lighthouse (mobile, slow 4G, localhost production build). First run: Performance 86, LCP 4.1 s. Two later runs: Performance 100, LCP 0.8 s. CLS 0, Accessibility 100, SEO 100 in the runs I saw. The LCP element is the hero paragraph.
- Not done yet: checking it on staging, a size check against the 150 KB budget, and checking the 360 px phone width by hand. TODO: update this list when done.

## 17. What each teammate can now explain/implement independently
- Explain why the form sends only contract fields and why the server stamps `consent_at`.
- Explain why AC-WL-02 is only proven against the stand-in.
- Swap `submitWaitlist` for a real fetch once WL-01 merges, and add error messages for network failure and rate limit.
- Run the tests and Lighthouse with the commands in section 11.

## 18. Further learning resources
- docs/LANDING_PAGE.md (sections 5, 6, 8 and 12)
- docs/API_CONTRACT.md (WL-01)
- Lighthouse scoring: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/

## 19. Docs updated because of this (per trigger table)
- docs/progress/R4_ui_design/PROGRESS.md, daily/D04_R4.md, CARRYOVER.md
- docs/learning/R4_ui_design/INDEX.md
- TODO: docs/CHANGELOG.md if the team wants the landing page listed.

## 20. Walkthrough drill: passed by / date
Not yet.
