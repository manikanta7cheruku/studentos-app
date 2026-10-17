> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# Product Description and Use Cases (user point of view)

| Field | Value |
|---|---|
| Doc ID | DOC-PROD |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R1 Product Owner |
| Status | Proposed |
| Related | `../02_PRODUCT_AND_UX/06_PRD.md`, `../02_PRODUCT_AND_UX/07_FEATURE_CATALOG_AND_USER_JOURNEYS.md` |

## 1. Product description

**StudentOS** is a private, college-branded web app (mobile-first, installable as a PWA later) where students of one college:
1. **Live campus life** - read official announcements, find events, report or find lost items, rent/buy/sell essentials, share notes, find people for sports.
2. **Build with others** - post a project or startup idea, say which roles/skills are needed, and let classmates request to join.
3. **Grow a career** - keep a list of internships/jobs, track every application, and prepare, with a plan that fits what the student has actually done.
4. **Own a profile** - one identity with skills, projects, achievements, and a shareable portfolio.

**For colleges:** each college gets its own tenant (e.g. `studentos.app/c/acme-engg`) with its own branding, members, rules, enabled modules, and administrators. A tenant starts **empty**. The college decides how students prove membership (college email, invite code, roster upload, manual approval, and so on), whether any cross-college visibility exists (default: none), and which modules are on.

**For StudentOS (the company):** one codebase serving many tenants, with strong data isolation, so adding a college is configuration, not a new build.

### What it is not (non-goals for the first release)
Not a payment processor or escrow; not a social network for the general public; not a job board scraper; not an LMS/ERP replacement; not an AI chatbot; not anonymous.

## 2. Personas
| ID | Persona | Situation | Main need |
|---|---|---|---|
| P-01 | **Aarav**, 1st-year | New to campus, knows few people | Know what's happening, find seniors' stuff and friends, start a profile |
| P-02 | **Meera**, 3rd-year | Wants to enter hackathons, has skills but no team | Find complementary teammates fast, show past work |
| P-03 | **Rohan**, final-year | Applying to 30+ companies | Never miss a deadline; see where each application stands |
| P-04 | **Kavya**, club/ambassador lead | Organises events, needs reach and credibility | Announce, collect interest, vouch for new members |
| P-05 | **Mr. Sharma**, college admin (placement/student-affairs/IT) | Wants an official, safe channel | Control who joins, post official notices, curate opportunities, see usage |
| P-06 | **Priya**, student moderator | Volunteers to keep the community clean | Review reports quickly, act with an audit trail |
| P-07 | **StudentOS staff** (platform admin) | Operates all tenants | Create tenants, support, monitor health, never see more data than needed |
| P-08 | **Recruiter / sponsor** (future) | Wants qualified students | Out of first release; see doc 04 |

## 3. Use cases (each from the student/admin point of view)
Priority tiers: **T0** core, **T1** high, **T2** medium, **T3** later. Teams choose scope at the Day-1 freeze.

### 3.1 Onboarding and verification (all T0)
- **UC-001 Join my college.** I open my college's link, enter my email, receive a code, and sign in. I choose how to prove I'm a student; until then I see only a limited "waiting for verification" view.
- **UC-002 Verify by college email.** If my college has registered its domain, I enter my college email, get a code, and I'm verified automatically.
- **UC-003 Verify by invite code.** My club lead or the admin gives me a code/link; I enter it and join (admin may still approve).
- **UC-004 Verify by roster match.** The college uploaded a list of enrollment numbers/emails; I enter mine and the system matches it.
- **UC-005 Verify by manual approval.** I give my enrollment number and program; an admin reviews and approves or rejects with a reason.
- **UC-006 See my verification status.** My profile shows pending / verified, which method, and what I can/cannot do yet.
- **UC-007 Leave a college or delete my account.** I can request leaving or deletion and see what happens to my posts and data.

### 3.2 Profile and portfolio (T0)
- **UC-010 Build my profile.** Add headline, skills with levels, interests, and goals.
- **UC-011 Add a project to my portfolio.** Title, summary, links, my role, teammates; it appears on my profile.
- **UC-012 Share my portfolio.** I toggle a public portfolio link and choose what is visible.
- **UC-013 Add achievements/certifications** with links.
- **UC-014 See my contribution history** (teams joined, projects, events attended, uploads), separate from career progress.
- **UC-015 Find students by skill** inside my college directory (respecting privacy settings).

### 3.3 Collaborate (T0 / T1)
- **UC-020 Post a team need.** "Hackathon team, need 1 designer + 1 backend dev, deadline Friday."
- **UC-021 Browse team posts** filtered by type, skills, status.
- **UC-022 Request to join** with a short message; I can withdraw.
- **UC-023 Decide on requests** as the post owner (accept/decline with note); slots update automatically.
- **UC-024 Close or expire a post** when full or no longer needed.
- **UC-025 Turn a team into a project** that records members and contributions (T1).
- **UC-026 Offer/request a skill swap** (e.g. "I teach Figma, I want to learn SQL") (T2).

### 3.4 Career (T0/T1/T2)
- **UC-030 Track applications (T0).** Save a role, move it through Saved → Applied → Assessment → Interview → Offer/Rejected/Withdrawn, add notes and deadlines.
- **UC-031 Get reminders (T1).** Deadline and follow-up reminders in-app (email optional).
- **UC-032 Browse curated opportunities (T1).** Listings posted by the college/platform with filters (type, skills, location, stipend, eligibility, deadline); save them.
- **UC-033 Career roadmap (T2).** Choose a target role; get milestones based on current skills.
- **UC-034 Daily action plan (T2).** Three tasks a day; missed ones reschedule.
- **UC-035 Resume builder and checks (T2).** Templates drawn from my profile; rule-based quality checks first.
- **UC-036 Interview practice (T3).** Role-specific question bank, saved answers, self-rating; AI feedback only after validation.
- **UC-037 Weekly review (T2).** Summary of tasks/applications and next-week priorities.

### 3.5 Campus (T0–T2)
- **UC-040 Read official announcements (T0).** Pinned, dated, from admins/moderators.
- **UC-041 Discover and RSVP to events (T1).**
- **UC-042 Report a lost item (T1).** Describe, add photo, location; **found** items posted by finders; claimant requests, finder approves; contact stays in-app until both agree.
- **UC-043 List an item to rent/sell/give away (T2).** Title, photos, price (display only), condition, availability; **no in-app payment**.
- **UC-044 Request an item (T2).** Message the seller in-app; seller accepts; agree to meet in a safe public place (guidance shown).
- **UC-045 Share/download notes (T2).** Subject/course/semester tags; declaration that I have the right to share; reporting for copyright.
- **UC-046 Find a game partner (T2).** Post "5-a-side football Sat 6 pm, need 3," others join.
- **UC-047 Anonymous community (T3, future).** Only after moderation tooling exists.

### 3.6 Safety and trust (T0)
- **UC-050 Report content/user.** One-tap report; I see the status.
- **UC-051 Block a user.** They can't contact me.
- **UC-052 Moderator reviews reports.** Hide content, warn, suspend; every action is logged.

### 3.7 College admin (T0/T1)
- **UC-060 Set up my college.** Branding, domain(s), verification methods, modules.
- **UC-061 Import a roster (CSV).** Preview, validation report, confirm.
- **UC-062 Create invite codes** with limits and expiry; revoke.
- **UC-063 Review verification requests** in a queue.
- **UC-064 Post announcements and curated opportunities.**
- **UC-065 Manage members.** Change role, suspend, remove.
- **UC-066 See usage and health (T1).** Active students, posts, reports - aggregate only.
- **UC-067 Export or delete tenant data (T1)** on contract end.

### 3.8 Platform staff (T0/T1)
- **UC-070 Create a tenant** and its first admin.
- **UC-071 Suspend or restore a tenant.**
- **UC-072 Support access with audit** (time-limited, logged; no silent browsing of student data).

### 3.9 Cross-college network (optional, T3)
- **UC-080 See opportunities from partner tenants** (read-only, opt-in by both tenants).
- **UC-081 Join an inter-college hackathon team** (requires both tenants to enable).

## 4. How features reinforce each other
Announcement → event → hackathon team post → project → portfolio entry → resume + opportunity matching → application → profile readiness. Each arrow is a *bridge prompt* (doc 07).

## 5. Product principles (summary; full list in doc 02)
Trust before growth · useful when empty · one clear action per screen · college admins in control · no dark patterns · privacy by default.
