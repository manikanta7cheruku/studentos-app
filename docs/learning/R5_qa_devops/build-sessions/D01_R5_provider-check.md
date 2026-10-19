# Provider check from official pages - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-18 / R5 (Testing and DevOps) |
| Linked task / ADR / PR | R5-D1-3 / ADR-011 (hosting and commercial use) / PR for branch r5/d1-docs-and-provider-check |
| Related docs | TECH_STACK_AND_PROVIDERS.md, PROVIDER_CHECK.md, ADR-011-hosting-commercial-use.md |

## 1. What we are learning and why it is needed
Before real student data goes anywhere, we must know what each provider really charges, limits and allows. The old doc used secondary sources and said R5 must confirm them on official pages.
## 2. What problem it solves
A wrong assumption (for example, hosting a commercial pilot on a free plan) can break the pilot or the terms of service.
## 3. Concepts and terminology (short glossary)
Official page: a page on the provider's own domain. Free tier: included usage at $0. Pause: a free project switched off after inactivity. Commercial use: any use by a business or for income. MAU: monthly active users. Egress: data sent out.
## 4. How it works internally (appropriate depth)
Not a code topic. Method: find the provider's own pricing and docs pages, read them, copy only facts the page states, mark everything else NOT VERIFIED, and write the date and link.
## 5. How it is used in StudentOS (files/modules)
docs/PROVIDER_CHECK.md (table filled, date 2026-10-18) with a cost line and open items for the admin.
## 6. Request/response and data flow (diagram or numbered trace)
Not applicable.
## 7. API methods, endpoints, schemas, status codes
Not applicable.
## 8. Database changes and relationships
None. Finding that affects the database: Supabase Free has no automatic backups and pauses after 1 week of inactivity, so real student data needs Pro.
## 9. Authentication / authorization behaviour
Not applicable. Supabase Free includes a custom SMTP server, which matters for sending login codes.
## 10. Errors and edge cases
Pages change. An older copy of the Vercel fair-use page said donations are not commercial; the current page says they are. Always note the date and the page version. Slack Free hides messages older than 90 days, so decisions must also live in the repo.
## 11. Tests: what exists and how to run them (exact commands)
No automated tests. Check: every row in the table has an official link and no blog or comparison site is cited as the source.
## 12. How to debug common failures
If an official page is hard to read, open the .md version of the pricing page or search the provider's docs domain. Never fill a number from memory.
## 13. Security considerations
No secrets or account details were written to the repo. Pricing pages need no login.
## 14. Alternatives and trade-offs
Other hosts (Cloudflare, Netlify, Render, Fly.io) and other email senders (Brevo, Amazon SES) were not checked today. D-11 stays open.
## 15. What AI generated or suggested (prompts used, summary)
The AI searched official pages and drafted the table. It marked what it could not confirm.
## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
YOU-FILL: write which official links you opened yourself and anything you found different from the table.
## 17. What each teammate can now explain/implement independently
Explain why Vercel Hobby cannot host the pilot, why Supabase Free is only for fake data, and what GitHub plan is needed for branch protection on a private repo.
## 18. Further learning resources
https://supabase.com/pricing , https://vercel.com/docs/limits/fair-use-guidelines , https://docs.github.com/en/billing , https://sentry.io/pricing/ , https://posthog.com/pricing
## 19. Docs updated because of this (per trigger table)
docs/PROVIDER_CHECK.md. Suggested for R2: TECH_STACK_AND_PROVIDERS.md section 5 values.
## 20. Walkthrough drill: passed by / date
Pending. Reviewer: R2 (not yet a repository collaborator).
