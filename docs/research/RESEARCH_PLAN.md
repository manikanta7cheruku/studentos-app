> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 03 - Problem Validation and Research Plan

| Field | Value |
|---|---|
| Doc ID | DOC-03 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R1 (R4 backup) |
| Status | Proposed; **no research has been performed yet - no findings are claimed** |

## 1. Assumptions and hypotheses
| ID | Hypothesis | Type | Evidence needed | Success signal (proposed) | Failure signal (proposed) | Deadline |
|---|---|---|---|---|---|---|
| H1 | Students recurrently struggle to find suitable teammates | Problem | Specific recent episodes | ≥ 6 of 12 describe an episode in last 3 months | < 4 of 12 | Day 3 |
| H2 | Students use workarounds that cost them time/missed chances | Problem | Workaround described + cost | ≥ 6 of 12 | < 4 | Day 3 |
| H3 | Placement-season students lose track of applications | Problem | They show current tracker | ≥ 3 of 5 final-years report a missed/forgotten deadline | 0–1 | Day 3 |
| H4 | A structured, college-only space beats WhatsApp for team finding | Solution | Behaviour in concierge test | ≥ 10 responses to ≥ 3 posts in 5 days | < 3 total | Day 6 |
| H5 | Students will verify with the offered methods | Solution | Completion rate in prototype/beta | ≥ 70% complete verification entry | < 40% | Day 7 / beta |
| H6 | A college staff member will own the admin role | B2B | Named person + permission | ≥ 1 of 3 colleges | 0 of 3 | Day 7 |
| H7 | Students would use a tracker instead of Sheets/Notion | Solution | Prototype task test | ≥ 4 of 5 complete "add and update application" unaided | ≤ 2 | Day 3 |
| H8 | Willingness to pay exists (college or recruiter) | Business | Named budget holder | 1 conversation with budget conversation | none | Post-beta |
*All thresholds are proposals; the team ratifies them (D-14).*

## 2. Interview plan
- **Who:** 12 students: mix of year (2× first-year, 4× second/third, 4× final-year), at least 3 non-CS, 2 club leads; plus 3 college staff (placement, student affairs, IT).
- **How:** 20–25 min, in person or call; two people (one asks, one notes); permission to note; no recordings without consent. Do not interview teammates' close friends only.
- **Rules:** ask about the **past**, not hypothetical futures; never pitch before the last 5 minutes; do not say "app" or "platform" early; record exact words.

### Student script (core questions)
1. Tell me about the last time you needed a teammate for a project/hackathon. What happened? How long did it take?
2. How did you find people? What did you try that didn't work?
3. Last time you applied for an internship/job - how did you keep track? Show me.
4. Have you ever missed a deadline or forgotten to follow up? What happened?
5. Last time you lost or needed to borrow/buy something on campus - what did you do?
6. Which groups/apps do you use for college things? Which do you mute? Why?
7. Do you trust people you meet in those groups? When would you not?
8. Have you ever paid for or switched to a tool for any of this? What made you switch?
9. (Last 5 min) Show prototype task; ask them to complete it while thinking aloud.
**Avoid:** "Would you use…?", "Do you think… is a good idea?", "Would you pay…?" (use past spending instead).

### College staff script
1. How do students currently get official information and opportunities?
2. What problems do you hear about around placements/clubs/lost items?
3. Who decides to adopt a new tool? What process?
4. What data/privacy concerns would you have?
5. What would you need before letting students use a platform under the college's name?

## 3. Demand tests (behaviour, not opinion)
| Test | Method | Cost | Measure |
|---|---|---|---|
| T1 Concierge Team Finder | Post a structured form + template in 1–2 college groups; manually repost responses | 0 | posts, responses, time-to-first-response |
| T2 Waitlist landing page | One page: "StudentOS for [College]"; action = join waitlist with college name | 0 | conversion %, source |
| T3 Prototype task test | Figma prototype, 5 students, tasks | 0 | task completion, errors, time |
| T4 Tracker swap | Ask 3 final-years to try tracker for 3 days | 0 | usage days, entries |
Do not call any metric a success until n and context are recorded. Small samples inform direction; they do not prove demand.

## 4. Competitor and workaround research plan (to be executed; nothing verified yet)
For each of: WhatsApp/Telegram groups, LinkedIn, Internshala, Unstop, Devfolio, Naukri, OLX, college ERP/LMS, GitHub/Behance, Notion/Sheets trackers:
| Field | To capture |
|---|---|
| What job do students hire it for | |
| Signup friction, cost | |
| College scoping/verification | |
| Strengths, weaknesses | |
| Source URL + access date | (mandatory) |
Owner R1 with R4; output table appended to this file under "Findings". **Date and cite every claim.**

## 5. Findings log (empty by design)
| Date | Source (interview/test/URL) | Observation | Implication | Decision link |
|---|---|---|---|---|

## 6. Feedback → decision process
Observation → tag → weekly synthesis (R1) → proposal in `DECISIONS.md` → team decision. A request from one student does not create a feature.

## 7. Ethics and consent
Explain purpose; consent to notes; no sensitive data; anonymise in documents; under-18 participants need parent/guardian consent per legal advice (OQ-09).
