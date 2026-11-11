# Slack message for the redesign (copy into #general, #r2-backend and #r5-qa)

**#general**

Big update from R3: StudentOS has a new look and new features. 🎨
• New design: dark, one brand gradient, glass bottom bar, smooth motion. Made for phones first.
• New: Ideas (short posts with votes and replies) and a Home feed of plans and ideas.
• New: sport and event plans (a match tonight? post it with a time and a place).
• New: a college admin can create their own space with a one-time owner code (`/setup`).
• Careers is now a "coming soon" page for the beta.
PR is up (docs/progress/R3_frontend/redesign/PR_DESCRIPTION.md). Please look at it on a real phone and tell us what feels off.

**#r2-backend**

R2, please review the migration `20261114000000_ideas_plans_college_codes.sql`:
• `idea_*` functions (votes, replies, remove with audit log for moderators)
• `college_setup_codes` + `make_college_setup_code` + `college_setup_create` (sha256 hash, single use, 14 day expiry, 5 tries an hour)
• `tf_post_json` was replaced with the same function plus a `place` key; `tf_set_place` is new
• kinds `sport` and `event` added to `team_posts`
Tests: pgTAP `015`, integration `ideas.test.ts`. They were written without Docker on my machine, so the PR checks are the first run. API shapes are in docs/API_CONTRACT.md section 15.

**#r5-qa**

R5, new screens to test at 390px and on desktop: Home, Plans (new card), New plan (sport and event), Ideas list, New idea, Idea detail (vote, comment, reply, delete), Sign in (welcome), Choose space (`/find`), College setup (`/setup`), You page, dock and create sheet, the new switch (keyboard: space toggles). The E2E specs for the old screens were adjusted (URLs `/home`, switches) and the Careers spec is skipped on purpose. Reduced motion should turn off the animations.
