# Protecting the main branch - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-18 / R5 (Testing and DevOps) |
| Linked task / ADR / PR | R5-D1-2 / ADR-008 (GitHub Flow) / PR for branch r5/d1-docs-and-provider-check |
| Related docs | CI_CD_AND_ENVIRONMENTS.md section 7, WORKFLOW.md, DEFINITION_OF_DONE.md, .github/CODEOWNERS |

## 1. What we are learning and why it is needed
Branch protection makes GitHub itself refuse bad changes to main: no direct pushes, a pull request, an approval and green checks. Without it, the rule "nobody pushes to main" depends on people remembering it.
## 2. What problem it solves
One wrong push or force push to main can break everyone's work or remove history.
## 3. Concepts and terminology (short glossary)
Branch protection rule: a GitHub setting on a branch. Required status check: a CI check that must pass before merge. Required review: a number of approvals. CODEOWNERS: a file that names who must review which folders. Force push: overwriting history, never allowed here. Linear history: only squash or rebase merges. Collaborator: a GitHub user with access to the repo.
## 4. How it works internally (appropriate depth)
The target rule from CI_CD_AND_ENVIRONMENTS.md section 7: pull request required, 1 approving review, required checks, no force push, linear history with squash merge. The required checks would be the five CI job names: Format check, Lint, Typecheck, Unit tests, Build. These names were read from GitHub on 2026-10-18 from the check runs of PR #1. They appear three times each in that list because CI runs for the push, pull_request and workflow_dispatch triggers.
## 5. How it is used in StudentOS (files/modules)
Settings only (GitHub repository settings). Related files: .github/workflows/ci.yml (the check names) and .github/CODEOWNERS (still has placeholder names such as @R2_GITHUB_NAME).
## 6. Request/response and data flow (diagram or numbered trace)
Intended flow: branch, push, pull request, five checks run, reviewer approves, squash merge. A direct push to main would be rejected by GitHub.
## 7. API methods, endpoints, schemas, status codes
`gh api repos/manikanta7cheruku/studentos-app/branches/main/protection` returned HTTP 403 with the message "Upgrade to GitHub Pro or make this repository public to enable this feature." This is the real result on our repo.
## 8. Database changes and relationships
None.
## 9. Authentication / authorization behaviour
Result on 2026-10-18: the repository is private, the owner has ADMIN permission, and the only collaborator is the owner (R2, R3 and R4 are not collaborators yet). `gh api user` returned plan null, so the plan name was not exposed to the token. GitHub's docs say protected branches on private repositories need GitHub Pro, Team or Enterprise.
## 10. Errors and edge cases
PR #1 was merged with no GitHub approval recorded (reviewDecision was empty), because no reviewer collaborator exists yet. This breaks the Definition of Done item "reviewed by someone who is not the author", and it is recorded here on purpose. Do not turn on "Require review from Code Owners" until CODEOWNERS has real GitHub usernames, or every PR becomes impossible to merge. The owner cannot approve their own PR.
## 11. Tests: what exists and how to run them (exact commands)
Planned proof once protection exists: try `git push origin main` from a test clone and see GitHub reject it. This proof was NOT possible today because protection could not be enabled. Nothing is claimed as passed.
## 12. How to debug common failures
If a required check never appears in the settings list, it has not run on the repo in the last 7 days. Run CI first, then choose the check by its job name.
## 13. Security considerations
Without protection, main can be force pushed. Mitigations until protection exists: the team rule in #decisions, small PRs, and every PR reviewed by someone other than the author once R2 is a collaborator.
## 14. Alternatives and trade-offs
Option 1: GitHub Pro for the owner (price not checked). Option 2: make the repository public (not recommended while internal plans and docs are in it). Option 3: keep the team rule only (free, not enforced). Rulesets were not checked; the page Settings, Rules on the repo shows whether an upgrade is needed. Admin decides.
## 15. What AI generated or suggested (prompts used, summary)
The AI suggested reading the plan and protection state through the GitHub CLI, found the plan rule in GitHub's docs, and drafted this file.
## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
R5 ran the commands and pasted the output on 2026-10-18: repository private, permission ADMIN, one collaborator, protection API HTTP 403 as quoted above, PR #1 reviewDecision empty. YOU-FILL: write what you checked yourself in the GitHub settings page.
## 17. What each teammate can now explain/implement independently
Explain why main is not technically protected yet, what the team rule is, and what the admin must decide. Anyone with ADMIN access can read the protection state with the command in section 7.
## 18. Further learning resources
https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
## 19. Docs updated because of this (per trigger table)
PROGRESS.md (status Blocked), CARRYOVER.md, daily file, PROVIDER_CHECK.md (GitHub row).
## 20. Walkthrough drill: passed by / date
Pending. Reviewer: R2 (not yet a repository collaborator).
