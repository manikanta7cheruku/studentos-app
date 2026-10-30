# Landing page and waitlist form - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D4-2 / ADR-009 (UI primitives) / branch r4/d4-landing-build |
| Related docs | docs/LANDING_PAGE.md, docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md |

## 1. What we are learning and why it is needed
The landing page is the first thing a student sees. Its job is to explain StudentOS in plain words and collect waitlist sign-ups with consent. It has to be honest (no fake numbers or reviews), accessible, and fast on a phone.

## 2. What problem it solves
Without a landing page, interested students have no way to hear about StudentOS or join the waitlist. Without a consent checkbox the team would store contact details without permission.

## 3. Concepts and terminology (short glossary)
- **Waitlist**: a list of people who want access when their college launches.
- **Consent checkbox**: a box the person must tick themselves (never pre-ticked) to agree to be contacted.
- **Honeypot**: a hidden field real people never fill. If it is filled, the submit is treated as a bot.
- **Stand-in**: a temporary in-memory function used until the real API exists.
- **LCP**: Largest Contentful Paint, how long until the main content shows.
- **CLS**: Cumulative Layout Shift, how much the page jumps while loading.
- **TBT**: Total Blocking Time, how long the main thread is busy.
- **Gzipped size**: the size of a file as it travels over the network.

## 4. How it works internally (appropriate depth)
- The page at `/` is mostly server-rendered sections. The FAQ and the waitlist form are the interactive parts.
- The form validates fields on the client and shows field-level errors. It sends only the fields in `waitlistBody` from the contract.
- On submit it calls `submit.ts`. Today that is an in-memory stand-in. A TODO says to swap it for R2's WL-01 endpoint.
- Placeholder pages (`/privacy`, `/terms`, `/contact`, `/safety`, `/colleges`) exist so footer and consent links do not return 404. They contain no legal text.

## 5. How it is used in StudentOS (files/modules)
- `src/app/page.tsx` (landing sections and metadata)
- `src/features/landing/faq-accordion` (FAQ)
- `src/features/waitlist/waitlist-form` and `src/features/waitlist/submit.ts`
- `src/contracts/engagement.ts` (`waitlistBody`)
- Placeholder pages under `src/app/privacy`, `terms`, `contact`, `safety`, `colleges`
- Tests: `tests/ui/waitlist-form.test.tsx`, `tests/a11y/landing.test.tsx`

## 6. Request/response and data flow (diagram or numbered trace)
1. The person fills the form and ticks the consent box.
2. The form checks the fields and the honeypot. Problems show as field errors.
3. If valid, the form calls `submit.ts` with the `waitlistBody` fields.
4. Today `submit.ts` stores the entry in memory and rejects the same email twice.
5. Later the same call goes to WL-01, which must save one row per email on the server.
6. The form shows a success message or an error message.

## 7. API methods, endpoints, schemas, status codes
The real endpoint is WL-01 (R2), not merged yet. The contract requires a name and a role value, which differs slightly from LANDING_PAGE.md. I followed the contract.

## 8. Database changes and relationships
None from R4. R2 owns the waitlist table.

## 9. Authentication / authorization behaviour
The page is public. No college data is shown. The server must still validate every field, because client checks can be bypassed.

## 10. Errors and edge cases
- Invalid email: blocked, error shown.
- Consent not ticked: refused.
- Same email twice: second entry not saved (checked against the stand-in only).
- Honeypot filled: treated as a bot.
- Input is kept after an error so the person does not retype.

## 11. Tests: what exists and how to run them (exact commands)
- `pnpm test` runs all tests: 13 files, 196 tests passed on 2026-10-31.
- `tests/ui/waitlist-form.test.tsx` (7 tests): invalid email, same email twice, no consent, keyboard-only with announced errors, preserved input, audience toggle, honeypot.
- `tests/a11y/landing.test.tsx`: one h1, no serious or critical axe problems.
- `pnpm verify` runs format check, lint, typecheck, tests and build.
- By hand: keyboard-only test (Tab, Shift+Tab, Space, Enter); Lighthouse mobile in Chrome.

## 12. How to debug common failures
- Typecheck complains about missing pages in `.next/`: run `rm -rf .next` and again `pnpm verify` (the cache came from another branch).
- Form does not submit: check the consent box and required fields, then the console.
- Slow page: use Lighthouse (LCP breakdown, treemap) and `pnpm exec next experimental-analyze`.

## 13. Security considerations
- No secrets, no real student data, no fake numbers or reviews.
- The consent text links to the privacy page, and the checkbox is not pre-ticked.
- Server-side validation and one-row-per-email belong to R2's WL-01.
- The "Verified" badge was removed because verification is not live.

## 14. Alternatives and trade-offs
- A stand-in now lets the form be built and tested before the API exists, but the real "one row per email" check waits for WL-01.
- Placeholder legal pages avoid 404s but must be replaced by R1's real text.

## 15. What AI generated or suggested (prompts used, summary)
AI helped with the page layout, the form wiring, the test ideas, and reading the Lighthouse and bundle results.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- Ran `pnpm verify` and read the output.
- Looked at the page in the browser and did the keyboard test by hand.
- Ran Lighthouse (mobile) and the bundle checks and recorded the real numbers.
- Checked the payload against the contract and read the diff before committing.

Measured results (2026-10-31, production build):
- Lighthouse mobile: Performance 86, Accessibility 100, SEO 100. FCP 1.6 s, LCP 4.1 s (target under 2.5 s, NOT met), TBT 60 ms, CLS 0.
- JS+CSS 236 KB gzipped plus HTML 12 KB gzipped, against a 150 KB budget (NOT met).
- Next.js analyzer: an empty route is 678 KB raw and the landing page is 746 KB raw, so most weight is shared baseline. Landing-specific code is about 68 KB raw.
- Not yet identified: the LCP element, and two chunks of about 75 KB gzipped.

## 17. What each teammate can now explain/implement independently
- Explain why the consent box is not pre-ticked and what the honeypot does.
- Run the waitlist tests and the keyboard test.
- Swap the stand-in in `submit.ts` for WL-01 when it is merged.
- Read a Lighthouse report and a bundle analyzer result.

## 18. Further learning resources
- docs/LANDING_PAGE.md, docs/ACCESSIBILITY.md
- Lighthouse and Core Web Vitals docs (web.dev)
- Next.js bundle analysis docs

## 19. Docs updated because of this (per trigger table)
PROGRESS.md, daily D04_R4.md, CARRYOVER.md (performance follow-up), R4 learning index.

## 20. Walkthrough drill: passed by / date
Not yet.
