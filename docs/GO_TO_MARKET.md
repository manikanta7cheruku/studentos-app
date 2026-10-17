> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 29 - Marketing and Go-To-Market

| Field | Value |
|---|---|
| Doc ID | DOC-29 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R1 (R4 backup) |
| Status | Proposed. No campaigns have run; no results claimed. |

## 1. Strategy in one line
Sell to **one college at a time**, start student-led, earn a named admin owner, then ask the college to sponsor. Optimise for **activation and repeated value**, not downloads.

## 2. Initial segment and geography
Your own college first (pilot, T-RES-01) → neighbouring colleges in the same city (Hyderabad/Telangana region is where the team is; confirm). Engineering/CS and placement-year students first (hypothesis).

## 3. Early-adopter recruitment
Interviewees → concierge-test participants → beta invitees (warm funnel). Sources: classmates' circles, clubs, hackathon teams, placement cell. Rule: invite in **cohorts of 10–15** to keep support manageable.

## 4. College ambassador programme (pilot version)
2–3 ambassadors per college (club leads, class representatives). Role: invite students, vouch for new members (V5), relay feedback. Not paid initially; recognition + references + early say in features. Rules: code of conduct; limits on vouches; audited.

## 5. Landing page and waitlist
Spec in doc 33. Two audiences: students ("get StudentOS for my college") and colleges ("bring StudentOS to my campus"). Waitlist captures college name + role + email with consent.

## 6. Beta onboarding
1. Admin owner confirmed; tenant created (RB-10). 2. Kit: link/QR, 1-page FAQ, how verification works, privacy summary, feedback form. 3. First 48 h: R1/R4 online for support; check queue twice daily. 4. Day 3 and 7 check-in messages (short). 5. Weekly 15-minute admin call.

## 7. Feedback collection
In-app "Send feedback" (category, text, optional screenshot), a monthly short survey, 5 follow-up interviews per cohort. All feedback tagged and synthesised weekly → proposals in `DECISIONS.md`. **A request is not a feature.**

## 8. Referral and organic experiments (each with a success criterion)
| ID | Experiment | Success (proposed) | Owner |
|---|---|---|---|
| GX-1 | Team-post share cards (link to college landing) in WhatsApp groups | ≥ 20% of new sign-ups cite it | R1 |
| GX-2 | Ambassador invite codes per club | ≥ 40% verification completion from codes | R1 |
| GX-3 | "Portfolio link" in resumes/LinkedIn | ≥ 15% of portfolios shared externally | R4 |
| GX-4 | Placement-cell announcement posting | ≥ 1 admin posts weekly for 3 weeks | R1 |
| GX-5 | Hackathon-season team-finder campaign | ≥ 10 posts in the hackathon week | R1 |

## 9. Launch communications
Pre-launch: waitlist emails (consented). Launch: college-specific message from ambassador/admin (trust), not mass spam. Post-launch: short "what we changed because of you". No misleading claims about numbers or features not live.

## 10. Community moderation and support
Moderators per tenant; rules visible at join; report SLA 24 h; escalate to R1; support email/form with ticket ids; FAQ.

## 11. Metrics (value, not vanity)
| Stage | Metric | Definition |
|---|---|---|
| Acquisition | Invites → sign-ups | by channel |
| Activation | Verified + profile complete + 1 action within 7 days | % of verified |
| Value | Team posts with ≥1 request in 72 h; requests accepted; tracked applications per final-year; announcements read | counts/% |
| Retention | Weekly active / verified; week-4 retention | cohort-based |
| Quality | Reports per 100 users; time to resolve; NPS-style one-question (optional) | |
| B2B | Admin weekly logins; admin-posted items; pilot-to-paid conversation | |
Do **not** report downloads/registrations alone.

## 12. Marketing risks
Spam perception; over-promising; moderation overload; college-reputation risk if something goes wrong (R-0xx).
