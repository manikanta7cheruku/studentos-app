# Release review, R3 Frontend (Day 10)

Written 2026-11-10 by R3 (project owner takeover). Honest, not flattering. The decision itself (go, wait or narrow) is the owner's at the release meeting.

## 1. What R3 delivered

| Day | Task | State |
|---|---|---|
| 1 | App shell, session, API layer (+ TEN-08) | merged (#37), CI green |
| 2 | Sign in, find a college, join, waiting | merged (#38) |
| 3 | Profile, skills, settings, people | merged (#39) |
| 3b | Global space and Continue with Google | merged (#40, #45), checked by hand on staging |
| 4 | Projects and portfolio | **deferred** (D-26): no backend, privacy review needed |
| 5 | Team Finder screens, post to My college or Global | merged (#48) |
| 6 | Requests and decisions | merged (#49) |
| 7 | Application tracker (backend and screens) and opportunities | merged (#50) |
| 8 | States sweep, offline, admin console on real data, reports | see the Day 8 PR |
| 9 | Bug fixes, speed check, walkthrough | see the Day 9 PR |

## 2. Gates (docs/DEFINITION_OF_DONE.md) and the evidence

| Gate | Status | Evidence |
|---|---|---|
| Every screen has loading, empty, error | **yes** | sweep table in docs/learning/R3_frontend/build-sessions/D08_R3_states-sweep.md; browser tests |
| Offline handled | **yes** | global banner, retry on failed loads, tested |
| Mobile first, no sideways scroll | **yes, in tests** | every journey checks it at a phone size. Not yet on a physical phone |
| Real backend, no sample data fallback | **yes** | R4's sample screens removed; all screens use `src/lib/api` |
| Tests run for real | **yes** | unit, integration, database and about 100 browser journeys on desktop and phone; CI runs them on every PR to `main` |
| Accessibility | **partly** | labels, focus, 44 px targets, reduced motion, `aria-pressed`, one link per row. **No automated scan (axe) of the real screens and no screen reader pass.** R4's accessibility review is not done by anyone yet |
| Independent review | **not yet** | the owner is the only author and reviewer of R3's takeover; R2 has not reviewed the tracker migration (R2-D7-2); R5 has not reviewed the browser tests |
| Verified on staging | **partly** | sign in with Google, Global, environment check 35 of 35. Days 5 to 8 were not clicked through on staging by a person |
| Real phone | **no** | |
| Real email sign in | **no** | needs a domain and an email sender; Google sign in is the way in |

## 3. What is not good enough, plainly

1. **One author, no second pair of eyes.** All of it was built and approved by the same hands. The rule says the author cannot approve own security code. The tracker migration, the open join method and the Google routes need a reviewer before real students use them.
2. **No accessibility scan** of the real screens. R4's sample screens had axe tests; I removed the sample screens and wrote none for the real ones.
3. **Moderation is thin.** Reports can be sent and handled, but there is no block button on screens (the API exists, RPT-04), no appeal, no spam control on Global beyond rate limits and a posting level.
4. **Global is open to anyone signed in.** Anyone with a Google account can post there. The only limits are rate limits and the 10 open posts rule. Needs a plan for abuse before it is advertised.
5. **Email codes are off** (Coming soon). Account deletion needs a code by email, so **deleting an account does not work on staging yet**.
6. **The public landing page is not wired** to the sign in and Global story: it still says "Join the waitlist" and does not explain Global.
7. **Bundle weight** 200 to 300 KB compressed a page: fine on 4G, slow on a weak phone with a weak signal.
8. **Missing features** a student would expect: edit or delete a team post's roles, a "my teams" overview, notifications settings, search across the college, the public portfolio (Day 4), resume or roadmap.
9. **Beta size.** One college, a few hundred students at most. Nothing was load tested beyond R2's performance tests.

## 4. Risks if released as it is

- A bug in a path nobody clicked through on staging (Days 5 to 8). Mitigation: the owner and two friends click every journey on staging first.
- Abuse in Global. Mitigation: do not link Global from the landing page for the first weeks; invite codes for the college only.
- A leaked secret or a wrong setting in production. Mitigation: `pnpm env:check --production` must say READY; two people hold the keys.

## 5. Recommendation (R3's view)

**Narrow, then go to a closed beta.** Release to ONE college by invite codes only, with Google sign in, Team Finder, the tracker, opportunities and announcements, and the admin console. Keep Global closed (no public link) and email codes off. Before that, three things are required: (1) a reviewer for the tracker migration and the Google and Global code, (2) every journey clicked through on staging on a real phone, (3) production set up with the checks in docs/PRODUCTION_SETUP.md. See the retrospective for what to do next.
