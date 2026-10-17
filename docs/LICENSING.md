> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 34 - Licensing and Intellectual-Property Guide

| Field | Value |
|---|---|
| Doc ID | DOC-34 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (technical licences, scans), R1 (brand, content, agreements) |
| Status | Proposed. **Engineering guidance, not legal advice.** ⚖ = needs qualified legal review. Specific licence names for libraries/fonts are from general knowledge and **must be confirmed from each package's own metadata/licence file** (CI scan, T-OPS-03/T-SEC-02). |

## 1. Why this matters
We will ship a commercial product that bundles many third-party parts. A wrong licence (e.g. using a "non-commercial" image, or a strong-copyleft library in closed code) can force us to open our source, pay, or take features down - and colleges will ask about it in due diligence.

## 2. The licences that apply to StudentOS (map)
| # | Layer | Whose licence | Typical examples | Our obligation |
|---|---|---|---|---|
| 1 | Our own source code | **We choose** | Proprietary / MIT / Apache-2.0 / AGPL | Decide (§3) |
| 2 | Third-party libraries (npm, SQL extensions) | Authors | MIT, BSD, ISC, Apache-2.0, MPL, LGPL, GPL, AGPL | Allowlist + attribution (§4) |
| 3 | Fonts | Foundries | SIL OFL 1.1, Apache-2.0, commercial EULA | §5 |
| 4 | Icons | Icon sets | ISC, MIT, CC-BY | §5 |
| 5 | Images, illustrations, photos, video | Creators/stock sites | Own work, CC0, CC-BY, CC-BY-SA, CC-BY-NC, stock licences | §6 |
| 6 | Design files/UI kits | Designers/Figma community | Varies | §6 |
| 7 | Services we use (terms of service) | Providers | Supabase, Vercel, GitHub, Figma, Sentry, PostHog, email provider | §7 |
| 8 | AI-assisted output | AI tool terms + law | Code/text/images from AI | §9 |
| 9 | User-generated content | Users → us | Posts, notes, portfolios, photos | §8 |
| 10 | Third-party data | Data owners | Opportunity listings, college rosters | §10 |
| 11 | Brand/trademarks | Owners | StudentOS name, logos, college logos | §11 |
| 12 | Agreements we grant | Us → customers/users | Terms, tenant (college) agreement, DPA | §12 |
| 13 | Team IP | Founders | Contributions, assignments | §13 |
| 14 | Documentation/knowledge base | Us | Docs, learning notes | §14 |

## 3. Choosing the licence for our own code
| Option | Meaning | Pros | Cons | Fit |
|---|---|---|---|---|
| **Proprietary ("All rights reserved"), private repo** | Nobody may copy/use/modify without permission | Keeps commercial options open; typical for B2B SaaS | Not open to community | **Recommended default for v1** |
| MIT / BSD / ISC | Permissive; anyone may use commercially | Community adoption | Competitors may take the code | Only if open-source strategy chosen |
| Apache-2.0 | Permissive + explicit patent grant | Patent clarity | Notice requirements | Open-source with patent concern |
| GPL-3.0 | Strong copyleft | Derivatives must stay open | SaaS loophole (network use isn't distribution) | Rarely useful for SaaS |
| **AGPL-3.0** | Copyleft that covers network use | Prevents closed SaaS forks | Scares enterprises; hard for B2B | Only for deliberate open-core |
| Source-available (BUSL/FSL-type) | Visible but restricted | Controls competitors | Not "open source" | Possible later |
**Decision D-20 (proposed):** private repository, proprietary headers `© <year> <legal owner TBD>. All rights reserved.` until the team and counsel decide on any open-source release. A `LICENSE` file stating this is added in T-OPS-01. Company/legal owner of copyright is **TBD** (doc 32 items 4, 9, 12). ⚖

## 4. Third-party dependency licences
### 4.1 Categories and policy
| Category | Examples | Policy for a closed SaaS |
|---|---|---|
| Permissive | MIT, BSD-2/3, ISC, Apache-2.0, 0BSD, Unlicense/CC0 | **Allowed.** Keep copyright notices; Apache-2.0: keep NOTICE text |
| Weak copyleft | MPL-2.0, LGPL, EPL | **Allowed with review**: modifications to that library's own files must be shared; don't statically bundle LGPL in ways that block replacement (rare in JS) |
| Strong copyleft | GPL-2/3 | **Not allowed** in shipped app code (review for dev-only tools) |
| Network copyleft | AGPL-3.0 | **Not allowed** (implicates SaaS) - including some DB/analytics tools; check before self-hosting any AGPL service |
| Non-commercial/ND | CC-BY-NC, "free for personal use", Commons Clause | **Not allowed** |
| Source-available | BUSL, SSPL, Elastic License, FSL | **Case-by-case, counsel review ⚖**; using the *hosted* service differs from self-hosting |
| No licence / unknown | repo without LICENSE | **Not allowed** (default = all rights reserved) |
| Dev-only tools (linters, test runners) | various | Allowed if not shipped; still record |
### 4.2 Expected licences of the planned stack (**verify per package**)
React, Next.js, Tailwind CSS, Zod, TanStack Query, React Hook Form, Radix UI, Vitest, Testing Library, supabase-js, Sentry SDK, PostHog JS SDK: **MIT** (expected). Playwright: **Apache-2.0** (expected). Lucide icons: **ISC** (expected). PostgreSQL: **PostgreSQL License** (permissive). pgTAP: **PostgreSQL License**-style (verify). k6: **AGPL-3.0** (expected) - **used only as a stand-alone test tool, not bundled or distributed with the product**; acceptable but record the exception ⚖. Supabase server components are mostly Apache-2.0 (expected); we use the hosted service - terms in §7.
### 4.3 Process
1. **Allowlist** in repo: `licenses.allow.json` (SPDX ids: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, Unlicense, MPL-2.0 (review), BlueOak-1.0.0, Python-2.0 if needed).
2. **CI check** on every PR (a licence-checking tool run over the lockfile; tool choice by R2 - verify its own licence). Fails on unknown/forbidden licences; exceptions need an entry in `THIRD_PARTY_REGISTER.md` with reason, approver, date.
3. **Attribution file:** generate `THIRD_PARTY_NOTICES.txt` at build (package, version, licence, copyright, licence text) and link it from the app's footer/legal page (MIT/BSD/Apache require notices to be retained).
4. **New dependency checklist** (PR): licence SPDX id · transitive dependencies scanned · maintained · size · alternatives considered (doc 12 §8).
5. **Copy-pasted code** (Stack Overflow, blog, GitHub): treat as third-party; Stack Overflow content is CC BY-SA (attribution + share-alike) - **don't paste substantial snippets**; write your own.
6. **Vendored/forked code** keeps its original licence header.

## 5. Fonts and icons
- **Fonts proposed in doc 09:** Fraunces and Public Sans - both expected under **SIL Open Font License 1.1** (verify on the font repos): free commercial use, embedding and self-hosting allowed; cannot sell the font by itself; derivative fonts can't reuse the Reserved Font Name; keep the OFL text with the files.
- **Self-host** the fonts (download from the official source, subset to Latin + needed ranges, ship licence file) instead of loading from a third-party CDN: better performance and avoids sending visitors' IPs to a third party (privacy, doc 19 ⚖). If Google Fonts hosting is used, record the decision and mention it in the privacy notice.
- **Indic scripts:** if Hindi/Telugu UI is added, pick a font with the same kind of licence (e.g. Noto family is OFL - verify).
- **Commercial fonts:** only with a written licence covering web use, app use, number of pageviews, and seats; keep the receipt in `LICENSES/`.
- **Icons:** Lucide (ISC) or Radix Icons (MIT) - verify; no copying icons from other products; no CC-BY icons without attribution on the legal page; **never** use brand logos (Google, WhatsApp, LinkedIn) beyond what each brand's guidelines allow.

## 6. Images, illustration, photography, video, design kits
| Source | Typical terms | Rule |
|---|---|---|
| Created by the team | We own (if members assign rights - §13) | Preferred |
| CC0 / public domain | No restrictions | OK; still record source |
| CC-BY | Attribution required | OK with credit on legal page |
| CC-BY-SA | Attribution + share-alike | Avoid in product (share-alike may extend to derivatives) |
| CC-BY-NC / ND | Non-commercial/no derivatives | **Never** |
| Stock sites (e.g. free-licence sites) | Site-specific licence; usually commercial use allowed, but not as a trademark/standalone resale; may restrict identifiable people/brand | Read the **current** licence text; keep a screenshot/PDF of the licence + download date |
| Google Images / random web | Copyrighted | **Never** |
| AI-generated images | Terms differ by tool; legal status uncertain | Avoid on public/brand surfaces (landing page rules §2 of doc 33); if used internally record tool + terms ⚖ |
| Photos of real people/places | Need consent / **model release**; college buildings/logos may need permission | Written permission for pilot-college photos; minors need guardian consent ⚖ |
| Figma community files/UI kits | Each file has its own licence | Check "commercial use" + attribution; do not ship a kit as-is |
Maintain `ASSETS_REGISTER.md`: asset, source URL, licence, date, attribution text, who added.

## 7. Terms of service of providers (they are licences too)
| Service | Watch for | Action |
|---|---|---|
| **Vercel Hobby** | Non-commercial personal use only (verified 2026-10-15) | Don't host the commercial beta on Hobby (ADR-011) |
| Supabase free/Pro | Usage limits, region, DPA availability, acceptable use | Read terms/DPA before real data ⚖ |
| GitHub | Private repos on free plan limits; Actions minutes | Verify limits (doc 12) |
| Figma free/education plans | Education plan may restrict commercial use | **Check before using an education account for company work** |
| Email provider, Sentry, PostHog | Data processing terms, sub-processors, quotas | DPA + listing in privacy notice |
| AI coding tools | Data-use and output terms; whether prompts are used for training | Choose business/no-training settings; never paste real data (doc: AI rules) |
| Domain registrar | Ownership in company/founder name | Doc 32 item 6 |
Keep a `SERVICES_REGISTER.md`: service, plan, account owner, terms reviewed (date), data shared, DPA status.

## 8. User-generated content (UGC) and student content
- **Users own their content;** by posting they grant StudentOS a **non-exclusive, worldwide, royalty-free licence limited to hosting, displaying, and operating the service** (and to the college tenant to display within the community) - in Terms ⚖. No licence to sell or use for advertising or model training without separate consent.
- **Public portfolio:** opt-in; user controls visibility; removal on request.
- **Notes/resources (F-20):** user warrants they own or may share the material; no scanned textbooks/paid course material; takedown contact and process (respond within a defined period); repeat infringers suspended; link to licences if content is openly licensed (e.g. CC). Module deferred partly for this risk (R-060). ⚖
- **Marketplace listings/photos:** user warrants rights to photos; prohibited items list.
- **Moderation:** right to remove content in Terms; audit trail (doc 13).
- **Student projects/IP:** team posts and projects may involve IP owned jointly or by the college/employer; platform disclaims; add a short notice: "Check your college/hackathon rules about who owns project work." ⚖

## 9. AI-assisted code, text and images
- Ownership/copyright of AI output is **legally unsettled and tool-dependent**; terms of each tool must permit commercial use ⚖.
- AI may reproduce licensed code. Mitigations: review for large verbatim blocks; run the licence scanner on dependencies; don't accept big generated blocks you can't explain; use tool settings that block public-code matches where available; record notable AI use in PRs.
- Don't feed confidential or personal data into tools without a business plan that excludes training.
- Don't use AI to generate content that imitates real people, brands, or copyrighted characters.

## 10. Data licences
- **Opportunity listings:** only content the college/platform has the right to post. **No scraping** of third-party job sites (terms/copyright/database rights). Link out to the original apply URL; don't mirror full descriptions without permission.
- **College rosters/data:** provided under the tenant agreement/DPA as personal data; used only for verification; deleted per retention (doc 13).
- **Public datasets (e.g. college lists):** check licence (open government data licences vary) before importing.
- **Analytics data:** ours, aggregated; no resale.

## 11. Brand and trademarks
- **"StudentOS" is a working name.** Before printing, domain purchase, or public launch: search for conflicts (domain, social handles, the Indian trade-mark registry, app stores); consider registration through counsel ⚖ (R-061).
- **College names/logos** are theirs: tenant branding requires the college's permission (tenant agreement grants us a limited licence to display it).
- **Third-party marks** (Google, LinkedIn, WhatsApp, Internshala, Unstop): use only in line with their brand rules and for factual reference; no implied endorsement; the competitor table in doc 03 is internal.
- **Logo/design ownership:** created by a member → written assignment to the project/company (§13).

## 12. Agreements StudentOS grants (to be drafted by counsel ⚖)
| Document | Between | Key points |
|---|---|---|
| Terms of Use | StudentOS ↔ students | Eligibility (age), acceptable use, UGC licence, moderation, termination, disclaimers, governing law |
| Privacy Notice | StudentOS → users | Doc 19 §4; DPDP-aligned |
| Tenant (college) Agreement / pilot agreement | StudentOS ↔ college | Scope, admin responsibilities, data roles (fiduciary/processor), logo licence, export/deletion, availability expectations (no SLA in beta), liability limits, fees later, term/termination |
| Data Processing terms with providers | StudentOS ↔ vendors | Sub-processor list |
| Ambassador/moderator guidelines | StudentOS ↔ volunteers | Conduct, confidentiality, no data export |
| Acceptable Use / Marketplace rules | StudentOS ↔ users | Prohibited items, safety |
| Copyright takedown policy | Public | Notice contents, counter-notice, timelines |

## 13. Team IP and contributions
Before more code is written, every contributor confirms in writing (even a signed one-page note, finalised by counsel ⚖): original work only; no employer/college/hackathon IP; assigns rights to the project/company (or grants a broad licence until the entity exists); no copying of code from previous employers/courses with restrictive terms; use of personal accounts vs company accounts for tooling. See doc 32 items 4–6. Use a **Developer Certificate of Origin**-style sign-off or a CLA only if outside contributors appear.

## 14. Documentation and knowledge base
Internal docs are proprietary. If any part is published (e.g. API docs), choose CC-BY-4.0 for text and keep code samples under the project licence. Don't paste third-party documentation or copyrighted articles into our docs; link instead and summarise in our own words.

## 15. Compliance checklist (release gate for S2)
- [ ] `LICENSE` (proprietary notice) present; copyright owner placeholder resolved or acknowledged.
- [ ] Licence scan passes; exceptions recorded in `THIRD_PARTY_REGISTER.md`.
- [ ] `THIRD_PARTY_NOTICES.txt` generated and linked.
- [ ] Fonts/icons: licence files shipped; self-hosting verified.
- [ ] `ASSETS_REGISTER.md` complete; no unlicensed/NC/unknown assets.
- [ ] `SERVICES_REGISTER.md`: plans permit commercial use (Vercel Pro or equivalent, Figma plan check).
- [ ] Terms, Privacy, tenant agreement reviewed by counsel or explicitly accepted as pre-review drafts with no real data beyond consented waitlist.
- [ ] Takedown process and contact live (before notes module).
- [ ] Contributor IP confirmations collected.
- [ ] College permission recorded for name/logo/photos.

## 16. Registers to create (templates in `../templates/`)
`THIRD_PARTY_REGISTER.md` · `ASSETS_REGISTER.md` · `SERVICES_REGISTER.md` (T-OPS-01 creates empty files; owners R2/R4/R5 maintain).
