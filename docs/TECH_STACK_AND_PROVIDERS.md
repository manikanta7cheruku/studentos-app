> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 12 - Tech Stack and Provider Decisions

| Field | Value |
|---|---|
| Doc ID | DOC-12 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (R5 for infrastructure) |
| Status | Proposed. Provider facts below were **checked on 2026-10-15 using secondary web sources and Vercel's own docs**; **official Supabase pricing page must be re-checked by R5 (T-OPS-08) before any commitment.** |

## 1. Stack baseline (SRC S2)
Next.js + TypeScript + Tailwind; Supabase (Postgres, Auth, Storage, Edge Functions); Vercel; PostHog/GA; Figma; Jira/Trello/Notion; Git + GitHub. We keep this baseline unless a verified blocker exists.

## 2. Decision table
| Area | Recommendation | Main alternatives | Why | Drawbacks | Lock-in / exit |
|---|---|---|---|---|---|
| Frontend + backend framework | **Next.js (App Router) + TypeScript** | Remix, SvelteKit, Nest + React | Matches source; large ecosystem; one language | App Router learning curve; frequent changes | Medium; code portable |
| Runtime | Node.js LTS | Bun, Deno | Stability | - | Low |
| Validation | **Zod** at every boundary; contracts package | Valibot, io-ts | Types + runtime validation | - | Low |
| Database | **PostgreSQL (Supabase)** | PlanetScale(MySQL), Neon, Firebase | Relational model, RLS for tenancy, SQL skills | Free tier pauses (below) | Low–medium: standard Postgres, dump/restore |
| Data access | **Supabase client + typed SQL/RPC**, generated types; migrations via Supabase CLI SQL files | Prisma, Drizzle | RLS works naturally with user JWT; fewer abstractions | Less ORM convenience | Low |
| Auth | **Supabase Auth** (email OTP/magic link) | Auth.js, Clerk, Keycloak | Integrated with RLS; no extra service | Customisation limits (e.g. SSO needs paid features, verify) | Medium |
| Storage | **Supabase Storage** (private buckets + signed URLs) | Cloudflare R2, S3 | Integrated policies | Free quota small | Medium |
| Email | **Supabase Auth email for OTP in dev; production SMTP via Resend/Brevo/SES** (decide after verifying free quotas and India deliverability) | Postmark, Mailgun | Deliverability matters for OTP | Sender-domain setup (SPF/DKIM/DMARC) needed | Low |
| SMS/phone OTP | **Not in v1** (optional signal later) | MSG91, Twilio | India SMS needs regulated sender registration (DLT, verify) and has per-message cost | - | - |
| Search | Postgres FTS + `pg_trgm` | Algolia, Meilisearch, Typesense | Zero extra infra | Relevance limits | Low |
| AI services | **None in v1** (ADR-010) | OpenAI/Anthropic APIs | Cost, accuracy, privacy | - | - |
| Hosting | **Vercel** (see §3: commercial use needs Pro) | Cloudflare Pages/Workers, Netlify, Render, Fly.io, self-host | Best Next.js support | Paid for commercial use | Medium |
| Domain/DNS | Cloudflare DNS + registrar of choice | - | Free DNS, DDoS protection | Domain costs money | Low |
| Observability | **Sentry** (errors), **Vercel/Supabase logs**, **PostHog** (product analytics) | Datadog, Grafana | Free tiers (verify) | Quotas | Low |
| Testing | **Vitest** (unit/integration), **Playwright** (e2e, a11y with axe), **pgTAP** (DB/RLS), **k6** (light load) | Jest, Cypress | Fast, TS-native | Learning | Low |
| CI/CD | **GitHub Actions** + Vercel previews | CircleCI, GitLab CI | Free for small repos (verify private-repo minutes) | - | Low |
| Local dev | Docker + Supabase CLI local stack, pnpm | devcontainers | Reproducible | Docker RAM needs | Low |
| Package manager | pnpm | npm, yarn | Speed, strictness | - | Low |
| Lint/format | ESLint + Prettier + `tsc --noEmit` | Biome | Standard | - | Low |
| Backup/recovery | Supabase daily backups on paid plan + **our own scheduled `pg_dump` to separate storage** | - | Independent restore path | Needs scripting | Low |
| Project mgmt | GitHub Projects (code-adjacent) or Trello/Notion | Jira | Free, linked to PRs | - | Low |

## 3. Provider facts (verified 2026-10-15 from web sources; re-verify on official pages)
### Supabase (secondary sources dated May–July 2026; they disagree on small details such as egress)
- Free plan: **2 projects per org, ~500 MB database, ~1 GB file storage, ~50,000 MAU**; free projects are **auto-paused after 7 days of inactivity** (data kept; restore from dashboard; app unreachable meanwhile).
- Free plan: **no automatic backups, no custom domains, no priority support** per the sources.
- Pro: **$25/month per organization**; no pausing; daily backups with 7-day retention; larger quotas and overage billing.
- Team: $599/month (SSO etc.). Compute instances are billed separately per sources.
- Sources: jetadmin.io (verified July 16, 2026), nocode.mba (June 2026), automationatlas.io (May 2026), bytebase.com (Feb 2026), aiagencyplus.com. **Confirm at supabase.com/pricing.**
### Vercel (official docs fetched via search 2026-10-15)
- **Hobby is restricted to non-commercial personal use only; commercial use requires Pro or Enterprise.** Official fair-use guidelines (vercel.com/docs/limits/fair-use-guidelines). Even asking for donations counts as commercial.
- Hobby: if usage limits are exceeded, features can be unavailable until 30 days pass.
- Pro: reported $20/month (per secondary sources); confirm.
**Implication (critical):** StudentOS is a business product for colleges. **Do not host the beta/production on Vercel Hobby.** Options: (a) use Hobby only for private prototyping with no commercial intent, (b) pay for Pro when launching to a college (even pilot with intent to monetise), (c) host on a provider whose free tier allows commercial use (verify: Cloudflare, Netlify, Render, Fly.io, others) - requires an ADR and test of Next.js compatibility. **Decision D-11.**

## 4. Free-first strategy matrix
| Stage | Hosting | DB | What's free | What must be paid | Data allowed |
|---|---|---|---|---|---|
| Prototype/dev | Local + Vercel Hobby (non-commercial dev only) | Local Supabase (Docker) | Everything | - | Fake only |
| Staging | Vercel preview/Pro-trial or alternate | Supabase Free project | Quotas apply, pause risk | - | Fake only |
| Pilot beta (S2) | **Commercial-permitted plan** | **Supabase Pro recommended** (backups, no pausing) | Domain DNS, Sentry/PostHog free tiers | Hosting Pro (~$20) + Supabase Pro (~$25) *(from sources, verify)* | Real, minimal |
| Public (S3) | As above + upgrades by metrics | Add compute/storage | - | Usage-based | Real |
Honest conclusion: **zero budget works for prototype and staging; it does not safely work for real student data**, because the free DB has no backups and pauses, and Vercel's free tier prohibits commercial use. The team should plan roughly **US$45–50/month** minimum at pilot *(unverified arithmetic from secondary-source prices; confirm)* or choose an alternative that provides backups and commercial use for less.

## 5. Per-provider checklist (R5 fills during T-OPS-08; **all PENDING**)
| Field | Supabase | Vercel | Sentry | PostHog | Email provider | GitHub Actions | Cloudflare |
|---|---|---|---|---|---|---|---|
| Free quotas | pending | pending | pending | pending | pending | pending | pending |
| Card required | pending | pending | pending | pending | pending | pending | pending |
| Sleeps/pauses | yes (7 d, sources) | no (sources) | no | no | n/a | n/a | n/a |
| DB size / connections | ~500 MB (sources) | n/a | n/a | n/a | n/a | n/a | n/a |
| Bandwidth/requests | pending | pending | pending | pending | pending | pending | pending |
| Build limits | n/a | pending | n/a | n/a | n/a | pending | pending |
| Backups | none on free (sources) | n/a | n/a | n/a | n/a | n/a | n/a |
| Data region | **verify India/Singapore options** | edge/regions | EU/US | EU/US | pending | n/a | n/a |
| Upgrade trigger | PENDING (see §6) | commercial use; usage | event volume | event volume | volume | minutes | - |
| Exit strategy | pg_dump + Storage export | redeploy elsewhere | export | export | switch SMTP | move CI | - |

## 6. Upgrade triggers (metric-based)
| Metric | Trigger | Action |
|---|---|---|
| Any real user data | Immediately | Paid DB with backups |
| DB size | > 70% of plan | Upgrade or prune |
| Storage/egress | > 70% | Upgrade, compress images |
| Auth MAU | > 70% of plan | Upgrade |
| P95 latency | > 1 s sustained for 3 days | Profile; indexes; compute upgrade |
| Error rate | > 1% requests for 1 day | Incident; capacity review |
| Email volume | > 70% of free quota | Paid plan |
| CI minutes | > 70% | Optimise or pay |

## 7. Hidden costs checklist
Domain (~annual), email sending + sender domain setup, SMS (if added), storage egress, backups, monitoring beyond free, legal review, prototyping tools (Figma plan limits), AI APIs (none in v1), moderation time, and **team time**.

## 8. Dependency policy
New package requires: exists on registry (typo-squat check), weekly downloads and maintenance, license compatible, bundle impact, no unnecessary transitive risk; recorded in PR. Lockfile committed. `pnpm audit` in CI.

## 9. Open items
D-11 hosting choice; email provider; Supabase region; whether to self-host auth later; choice of headless UI library (ADR-009).
