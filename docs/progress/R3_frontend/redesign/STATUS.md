# Status after the redesign (2026-11-11)

## Done (in the pull request)
- Design system v2, glass dock, create sheet, buttons, switch, cards, motion.
- Home feed, Ideas (list, new, detail, votes, replies, delete), Plans as cards, sport and event plans.
- Welcome (sign in), choose space, college setup with an owner code, new landing page, Careers placeholder.
- Backend for all of it (migration, routes, contracts, docs, tests written).

## Still in progress (screens that got the new colours and type but not a full rebuild)
These use the new tokens, so they look right, but they were not redesigned screen by screen yet:
- You page is rebuilt (More menu); **Edit profile, Skills, Settings, People list, Person page**: restyled by tokens only.
- **Notifications, Requests (sent and received), Plan detail join dialog, Plan requests for the owner**: restyled by tokens only.
- **Admin console** (overview, verification, members, invites, announcements, reports, settings and audit): restyled by tokens only; still the old layout.
- **Join pages** (invite, email, pending) use the new frame but keep the old forms.
- **Campus** (notices) keeps the old layout.

## Not built yet
1. **Reporting an idea or a comment** (the report button and the moderator queue entry). Needed before Global gets many people.
2. **Notifications for ideas** (a reply to my idea, my idea reached 100 votes).
3. **Search** across plans, ideas and people.
4. **Platform admin dashboard** (owner view: colleges, users, sign-ups, errors; make setup codes from a screen).
5. **Events, Lost and found, Marketplace, Notes** (the campus tiles are "coming soon" ideas, not built).
6. **Careers** (tracker and opportunities are built but hidden; D-31).
7. **Day 4 projects and portfolio** (deferred by D-26).
8. Photos for plans and ideas, a profile cover, an installable app manifest (add to home screen), push notifications.
9. Dark/light choice (there is one theme by decision).

## What the owner must do
- Merge the PR after the checks pass and R2 has reviewed the migration.
- Let the Staging workflow run the migration, redeploy, and look at it on a real phone.
- Run `create-setup-code.sql` for the first real college and test `/setup` with a real Google account.
- Delete the old fonts in `public/fonts` when happy (they are unused).

## Risks
- pgTAP, integration and E2E were not run before the PR. Expect a round of small fixes after the first CI run.
- The old E2E specs may still hold text that changed.
- Setup code attempts are limited per person, not per network.
