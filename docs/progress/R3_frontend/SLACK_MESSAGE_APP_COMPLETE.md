# Slack messages: the app is built, R1 and R5 are next

Copy each block into its channel. Channel names for R1 and R4 are guesses (`#r1-product`, `#r4-ui`): change them to your real ones.

**#general**

StudentOS is feature complete for the pilot. 🎉 R2, R3 and R4 are done. What is left is R1 and R5.
What is in the app:
• Plans (matches, hangouts, hackathons, projects) with one tap join, a "who is in" list and a note to the host
• Events: Official (college admins) or Personal (Global), optionally invite only
• Turf and courts: anyone adds a venue, students ask for hours, the venue manager confirms by hand (no payments yet)
• Buzz (short posts) with likes and dislikes on posts and on comments
• Marketplace and Lost and found, Profiles with skills, People directory, Notifications
• Public space: a post can be made for everyone. It shows in every college feed with a Public tag
• Admin console and Owner dashboard: remove anything with a reason that is sent to the author
• New look: glass design, smooth create sheet, calmer cards, faster screens (app runs next to the database)
Merged: PR 58. Open and green (all 10 checks): PR 59. Please do not merge until R5 has run the staging steps below.

**#r5-qa**

R5, you are on the critical path now. Please do these in order:
1. After PR 59 is merged, run the **Staging** workflow so the new migrations reach staging: `20261117` (functional round), `20261118` (turf booking), `20261119` (comment likes), `20261120` (venues for everyone). Check that the workflow is green and the smoke test passes.
2. Test on staging with **two real accounts** (one college admin, one student), on a phone (390px) and on desktop:
   • Plan: create a sport plan, join with one tap from the second account, host gets "joined", both see "who is in"
   • Event: admin creates an Official event, a student in Global creates a Personal event, invite only stays out of the list
   • Turf: add a venue, request hours, confirm and decline, a second request on confirmed hours is refused, cancel frees the hours
   • Public post: post with "Public, everyone" from a college, it shows in another college's feed with the Public tag
   • Buzz: post with only a few words, like and dislike a post and a comment
   • Removal: admin removes a plan or buzz with a reason, the author gets the reason in Updates; owner dashboard `/owner` Content page too
3. Add the new endpoints to your regression run (permission matrix already has VEN-01..10, TMF-11/12, ADM-13/14, IDE-09).
4. Still open from your carryover: branch protection on `main`, staging checkpoint, backup and restore drill, small load test, security scans, production runbooks (docs/PRODUCTION_SETUP.md), monitoring.
5. Notes from CI: the browser install no longer uses apt (it failed on the runners once), and GitHub Actions minutes ran out once this month. Please check the Actions budget before the next big run.
6. The repo was made public for a while so CI could run. It should go **back to Private** after the merge. Please check there are no forks first.

**#r1-product**

R1, the product is ready to test with real students, so your tasks are now the blocking ones:
1. **Usability sessions on staging** (5 students): ask them to make a plan, join one, post a buzz, book a turf hour, and list something in the marketplace. Note where they hesitate. Please also ask what they think "Public" means on a card.
2. **Interviews and synthesis**: please record what we learned and what we still do not know (docs/progress/R1_product/PROGRESS.md has no rows yet).
3. **Legal for the pilot**: the privacy notice and terms must now cover public posts (visible to every college), marketplace listings, turf bookings and the removal of content with a reason. Drafts are in docs; please finish them.
4. **Beta kit and pilot plan**: which college first, how many students, who is the admin, who answers turf requests.
5. **Go or wait checklist** and the release meeting; then the retrospective and next phase plan.
Open product decisions I need from you: payments (turf and marketplace) later or not, a first-run interest picker, photos, and direct messages. These are my suggested next features.

**#r2-backend** (short)

R2, thanks. Four new migrations to review when you have time: `20261117` (open join, participants, event kinds, content removal), `20261118` (turf booking), `20261119` (comment likes), `20261120` (any member can add a venue). pgTAP `018`, `019`, `020` passed in CI.

**#r4-ui** (short)

R4, the UI follows D-28/D-29 plus glass cards, floating create sheet, and calm cards (D-37). Please look at Home, Plans, Buzz, Events, Market, Turf and the three create forms on a real phone and send me anything that feels off.
