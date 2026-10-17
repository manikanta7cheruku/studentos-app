> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 33 - Landing Page Specification

| Field | Value |
|---|---|
| Doc ID | DOC-33 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R4 (design + build), R1 (copy, claims), R2 (consent/analytics/security review) |
| Status | Proposed. **No page, wireframe, or Figma file exists yet** (T-DES-02/03, T-MKT-01). Copy is a draft for the team to rewrite in its own voice. |
| Related | doc 09 (tokens), doc 10 (accessibility), doc 29 (GTM), doc 34 (asset licences), doc 19 (privacy) |

## 1. Purpose and success measures
Convert two audiences with one honest page: **students** ("get StudentOS at my college") and **college staff** ("bring StudentOS to my campus"). Goal is *qualified waitlist/lead capture*, not vanity traffic.
| Metric | Definition | Target (hypothesis to ratify) |
|---|---|---|
| Waitlist conversion | submits / unique visitors | ≥ 8% from direct invites (warm traffic) |
| Lead quality | submissions with valid college + role | ≥ 80% |
| College-staff leads | "for colleges" form submissions | ≥ 3 in the pilot period |
| Page performance | LCP on mid-range phone 4G | < 2.5 s; CLS < 0.1; INP < 200 ms |
| Accessibility | axe critical issues | 0 |

## 2. What "professional, not AI-generated" means here (hard rules)
**Do not use:** purple/blue gradient hero with floating blobs; a row of three identical icon-in-circle cards; stock photos of smiling diverse students at laptops; fake testimonials, fake logos ("trusted by…"), fake counters ("10,000+ students"), fake app mockups with placeholder data; emoji bullets; generic taglines ("Unlock your potential", "Supercharge", "revolutionize"); decorative glassmorphism; auto-playing carousels; chat-bot popups; dark patterns (countdown timers, "only 3 spots left").
**Do:** specific, plain statements of what the product does; real product visuals only once real screens exist (until then, simple typographic layout and diagrams); honest status ("In development - join the waitlist"); strong typography; asymmetric, editorial layout with generous whitespace; real photographs only with consent/licence; consistent tokens from doc 09; one primary action per viewport; copy that mentions actual verification and privacy practices.
**Review test:** remove the logo - could this page belong to any SaaS? If yes, rewrite the copy until it could only be StudentOS.

## 3. Visual direction
Uses the doc 09 system (warm paper background `#FAF7F2`, ink `#1B1A17`, accent default `#2340C8`, Fraunces headings, Public Sans body) with a slightly more editorial scale: Display 3–3.5 rem on desktop. Marketing may use a **larger type scale and asymmetry**, not new colours. Imagery options (decide in T-DES-02), in priority order: (1) typographic + diagram-based visuals (e.g. a simple annotated diagram of "one college space, four areas"); (2) the team's own illustration in a consistent line style; (3) photography of the pilot college **with written permission** (ask the college; ⚖ for logo/name use); (4) licensed stock (see doc 34 §6) only if it looks like real campuses, not staged. **No device-frame mockups until real UI exists.**

## 4. Information architecture and routes
`/` main page · `/colleges` for college staff · `/safety` how verification, privacy, and moderation work · `/privacy` · `/terms` · `/contact` · `/404`. Optional later: `/changelog`, `/blog` (only if there is something to say).
Header: wordmark + links (Colleges, Safety) + primary button "Join the waitlist". Footer: legal links, contact email, "Working name: StudentOS" note until branding is final (R-061), copyright line, link to status page when it exists.

## 5. Main page sections (top to bottom) with draft copy
Draft copy is intentionally plain; replace with the team's voice after interviews. Do **not** state anything not true when the page goes live; move items to "Coming next" if unbuilt.

**S1 Hero** - H1: "One place for your college." Sub: "Find teammates for projects and hackathons, keep track of your internship applications, and build a portfolio - in a space run by your own college." Primary: "Join the waitlist". Secondary text link: "Bringing StudentOS to a college? →". Small line: "Free for students. Currently in development." Visual: typographic block or diagram; no device mockup.
**S2 The problem, in student words** - 3 short quotes **only from real interviews with consent** (placeholder until then: omit the section). Otherwise a two-line honest framing: "Teams get formed in group chats. Applications live in spreadsheets. Projects disappear when the semester ends."
**S3 What you can do** - three focused blocks (alternating layout, not identical cards): *Find your team* (post roles you need, see who requests, accept or decline) · *Track every application* (statuses, deadlines, reminders - private to you) · *Show what you've built* (profile and portfolio with projects you can share). Each with one concrete sentence and, once available, one real screenshot. A fourth line "Coming next: campus announcements, Lost & Found, events" labelled clearly as not yet available.
**S4 Your college, your rules (trust)** - explains: each college has its own private space; members are verified (college email, invite codes, roster, or admin approval - depends on the college); your application tracker is never visible to anyone else, including admins; data minimisation; reporting and moderation. Link to `/safety`.
**S5 How it starts** - numbered 1–3: "Your college joins → you verify you belong → you start." Honest note: "Verification methods differ by college."
**S6 For colleges** - short pitch with link to `/colleges`: control membership, post official notices and opportunities, no cost to start (**only if true**), data export/deletion on request (**only if implemented**).
**S7 FAQ** - accordion with real questions: Is it free? Which colleges? Who can see my profile? How do I verify? What data do you collect? Can my college remove content? How do I delete my account? What if my college isn't on StudentOS? (answers from docs 15/19; keep short).
**S8 Waitlist form (final CTA)** - see §6.
**S9 Footer.**

## 6. Waitlist and lead forms (functional spec)
| Field | Rules |
|---|---|
| Audience toggle | Student / College staff (changes labels) |
| Name | optional, ≤ 80 |
| Email | required, valid, ≤ 254 |
| College name | required, ≤ 120, free text (no autocomplete leak of tenants) |
| Role | select: Student (year), Club/ambassador, Faculty/staff, Other |
| Consent | required checkbox: "I agree to be contacted about StudentOS and have read the Privacy Notice" (link) - not pre-checked; timestamp stored |
| Spam control | honeypot + server rate limit (5/hour/IP) + Cloudflare Turnstile if abused |
- Submit via `POST /api/v1/waitlist` (WL-01, idempotent by email+college). Success: inline confirmation with what happens next ("We'll email when your college opens. You can reply to that email to unsubscribe."). Errors: field-level, plain language; preserve input; no duplicate-submission side effects. Double opt-in email (T2) to protect deliverability.
- Stored per doc 13 `waitlist_leads`; retention 12 months; deletion on request; exportable. Never sold or shared.
- Acceptance criteria: AC-WL-01 invalid email shows an error and nothing stored; AC-WL-02 same email twice returns success without duplicating; AC-WL-03 without consent, form refuses; AC-WL-04 keyboard-only submission works and errors are announced.

## 7. Content and claims policy
Every claim is true on the day published and traceable to a doc/feature. No statistics unless measured and dated. No competitor disparagement. No "verified by government/college" language unless the method is live. Mention the working name status. Reading level: plain English; short sentences; no jargon ("tenant" never shown).

## 8. Performance, SEO, accessibility
- **Budgets:** HTML+CSS+JS < 150 KB gz on first load (no heavy animation libraries); hero image (if any) ≤ 120 KB WebP/AVIF with explicit width/height; fonts: 2 families, `font-display: swap`, self-hosted subset (also avoids third-party font requests - see doc 34 §5); no layout shift; no third-party scripts before consent except privacy-friendly analytics decision (below).
- **SEO:** semantic headings (one H1), unique title ≤ 60 chars and meta description ≤ 155, canonical URL, Open Graph + Twitter card images (1200×630, designed, not auto-generated gradient), `sitemap.xml`, `robots.txt`, JSON-LD `Organization` (once legal entity/name is set), `lang` attribute, 404 page that helps.
- **Accessibility:** doc 10 in full; skip link; visible focus; FAQ accordion uses buttons with `aria-expanded`; form errors via `aria-describedby`; reduced-motion respected; contrast per tokens; touch targets ≥ 44 px; works at 320 px and 200% zoom.
- **Responsive:** mobile-first; hero legible without scrolling at 360×640; no horizontal scroll.

## 9. Analytics and consent
Use PostHog (or a privacy-friendlier configuration; **decision D-19**) with: no PII in events, IP anonymisation/disabled, cookieless mode if available, no cross-site tracking, events `landing_view`, `cta_click{location}`, `waitlist_submit{audience}`, `waitlist_success`. If cookies/storage are used beyond strictly necessary, show a **plain consent banner** (equal-weight Accept/Decline, no pre-ticks) - wording to confirm with counsel ⚖. Respect Do-Not-Track as a courtesy. Ad pixels: none.

## 10. Security of the page
Static or server-rendered with no secrets; CSP + security headers (doc 19); form endpoint validation, rate limits, CSRF/Origin check; no user-supplied HTML rendered; dependencies pinned; links to external sites `rel="noopener noreferrer"`.

## 11. Legal pages (must exist before the page is public)
`/privacy` (what data, why, retention, processors, rights, grievance contact, children's data statement - **drafted by R1 from doc 19 and reviewed by counsel ⚖**) · `/terms` (acceptable use, UGC licence, disclaimers; doc 34 §8) · `/contact` (real email; response expectation). Footer shows contact details. Until counsel review is complete, the page states "Draft" internally and is not publicly launched with real data collection beyond the waitlist; the waitlist consent text is minimal and accurate.

## 12. Build and QA
- Route group `(marketing)` in `src`, server components, no client JS except the form and FAQ.
- Tests: component tests for form validation; Playwright: submit success/failure, duplicate, keyboard-only, mobile viewport; Lighthouse CI budget; axe zero critical; visual review at 360/768/1280 vs Figma; link checker; copy review checklist (§7) signed by R1.
- **Done when:** doc DoD + §1 targets measured on staging + legal pages live + counsel flagged items resolved or explicitly accepted.
