# Pilot go-live gate

Status: **in progress, opened 17 Nov 2026.** This is the checklist between "code merged" and "real gyms using ClubKeep every week" (roadmap Phase 2 gate: 5 partner gyms). It links to the existing runbooks instead of repeating them. Nothing here is done by merging a pull request: most steps are operator actions on the production host, and the agent has no access to that host or its secrets.

Related: [PRODUCTION_RELEASE.md](PRODUCTION_RELEASE.md), [PHASE_0C_RUNBOOK.md](PHASE_0C_RUNBOOK.md), [PHASE_0D_RUNBOOK.md](PHASE_0D_RUNBOOK.md), [BACKUP_RESTORE.md](BACKUP_RESTORE.md), [PLATFORM_ADMIN_BOOTSTRAP.md](PLATFORM_ADMIN_BOOTSTRAP.md), [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md).

## 1. Verified starting point (17 Nov 2026)

| Fact                                                                                                                                                        | Source                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `main` is at the B7 merge (`da35e43`); CI (x64, ARM64, PostgreSQL 17) was green on it                                                                       | PR #35 checks                                                                            |
| The deploy workflow **succeeded for that commit** (run 144, 16:36 UTC), so B7 is live. Auto-deploy therefore appears to be enabled (`CLUBKEEP_AUTO_DEPLOY`) | GitHub Actions history; earlier runs show a mix of success, skipped and failure          |
| Production auth flags (`GOOGLE_AUTH_ENABLED`, `EMAIL_LINK_AUTH_ENABLED`, `PASSKEY_AUTH_ENABLED`) were documented as **off**                                 | PRODUCTION_RELEASE.md (verify live: `GET /api/auth/capabilities`)                        |
| A platform admin can sign in with the legacy password method only                                                                                           | PLATFORM_ADMIN_BOOTSTRAP.md                                                              |
| Any verified-email account may create a club (3 per rate window); there is no approval list                                                                 | `src/app/api/clubs/route.ts`, `createClub`                                               |
| Magic link and Google both **create new users** (`disableSignUp: false`); no allowlist                                                                      | `src/lib/auth.ts`                                                                        |
| No age or jurisdiction check exists anywhere in the sign-up path                                                                                            | code search; PHASE_0D_RUNBOOK.md item 5 says this must be validated before public signup |
| The real backup/restore drill has only been proven on synthetic data in CI                                                                                  | BACKUP_RESTORE.md                                                                        |

## 2. Owner decisions that change earlier rules

- **G1: no sign-up gate (owner decision, 17 Nov 2026).** Google and email-link sign-in are open to everyone, and any verified account may create a club. This **supersedes** the PHASE_0D_RUNBOOK statement that 0D is not authorization to open public registration, and the PHASE_0C_RUNBOOK note that only operator-approved registration may be made public. No allowlist or code change is needed.
- **G2: age/jurisdiction check is not done and is an accepted risk.** The 0D runbook (item 5) and rule 15 require validating age/guardian and jurisdiction rules before public sign-up. Nothing in the sign-up path checks age, so under-18s can create accounts. The owner has accepted opening without it for the pilot. Revisit before any marketing push, before teen-facing features, and before any Personal health data exists. Mitigations that need no new code: keep the kill switch ready (section 5), watch new-account volume, and keep the Free caps (25 members, 1 staff) in place.
- [ ] **G3: kill switch rehearsal.** Flipping the three auth flags to `false` and restarting `clubkeep-web` is the fastest way to close sign-in; rehearse it before the first pilot club (section 5). With open sign-up this is the only brake, so it matters more than before.

## 3. Operator steps (you, on the VPS and provider consoles)

Do these in order. Record evidence (date, command output summary, no secrets) in the log in section 7.

### A. Safety net first

- [ ] A1. Confirm the running SHA and migration status on the **ClubKeep-only** database (`prisma migrate status`); confirm MenuMinute services are healthy.
- [ ] A2. Confirm a recent pre-migration dump exists under `/var/lib/clubkeep/backups`, then `clubkeep-restore-drill --inspect` on it.
- [ ] A3. Run `clubkeep-restore-drill --execute` against a **real** dump, preferably on an offsite test host (BACKUP_RESTORE.md). CI only proves the tooling on synthetic data.
- [ ] A4. Set up independent daily backups with an encrypted offsite copy and an alert. Do not enable backup pruning until this and A3 are done.

### B. Edge and state hardening (PHASE_0C_RUNBOOK sections 2 and 4)

- [ ] B1. Dedicated non-evicting ClubKeep auth Redis (`127.0.0.1:6383`) with its own password; confirm MenuMinute's 6381 and 6382 are untouched. Rate limiting must fail closed if it is down (verify by stopping only the ClubKeep Redis in a quiet window).
- [ ] B2. Nginx overwrites `X-ClubKeep-Client-IP` from the verified client address; the loopback app port (3200) is not reachable from outside.
- [ ] B3. Nginx access-log format contains no query tokens or request bodies; no third-party analytics on auth pages.
- [ ] B4. Mail-in-a-Box: dedicated ClubKeep mailbox, SPF, DKIM and DMARC pass, and a real message reaches a Gmail and an Outlook inbox (a TLS handshake alone proves nothing).

### C. Provider activation (one at a time, ClubKeep restart only)

Owner decision: Google and email link go live **together**, then passkeys (passkeys need an existing session). Two failure modes at once, so test them separately in order C1, C2 before telling any club.

- [ ] C1. Google (enable with C2 in one restart): dedicated OAuth web client with redirect `https://clubkeep.bababuilds.com/api/auth/callback/google`, scopes `openid email profile` only. Set the flag and secrets in `/etc/clubkeep/web.env`, restart `clubkeep-web` only.
- [ ] C2. Email link: SMTP settings, flag on, restart.
- [ ] C3. Passkeys: `PASSKEY_RP_ID` and `PASSKEY_EXPECTED_ORIGIN`, flag on, restart.
- [ ] After each: `GET /api/auth/capabilities` shows exactly the intended methods, and MenuMinute health is unchanged.

## 4. Acceptance script (run on the deployed build, with real accounts)

Authentication (PHASE_0C_RUNBOOK section 4):

- [ ] Google first login; returning login with the same account; same-email collision gives `account_not_linked`; explicit link from the security page within 10 minutes of sign-in.
- [ ] Magic link: opening the page does not consume it; one click confirms once; replay, expired and tampered links fail; no token in access logs.
- [ ] Passkeys on desktop Chrome, Android Chrome and iOS Safari: add, sign in, rename, delete (last-factor guard), recovery through Google or email.
- [ ] Sign-out revokes the session; auth responses are `no-store`; rate limit denies when Redis is down.

Club onboarding (PHASE_0D_RUNBOOK items 6 and 7):

- [ ] Verified owner creates a club and becomes OWNER; setup wizard completes.
- [ ] Issue an invite and open it in a second browser or phone via the QR; a different verified account claims it exactly once; the owner can revoke it.
- [ ] Two claimants race one link: exactly one wins. Expired, revoked and replayed links fail. Staff and manager cannot elevate roles. Cross-club and suspended-club access is refused.

Core club journey (B1 to B7), on a phone at 360 and 390px, light and dark:

- [ ] Create plan, add walk-in member, assign term, renew.
- [ ] QR check-in, manual check-in, attendance history and CSV.
- [ ] Record an external payment, print the receipt, reverse a payment.
- [ ] Member opts in to the league; score submit and approve; challenge join.
- [ ] Insights page loads with real data and an empty club shows honest empty states.
- [ ] Staff cannot reach finance or insights; members cannot reach owner pages.

## 5. Rollback and kill switch (rehearse once before the first pilot club)

- Code rollback: the release helper moves the `current` symlink back; schema changes are forward-only and are never rolled back automatically (PRODUCTION_RELEASE.md).
- **Auth kill switch:** set the three `*_AUTH_ENABLED` flags to `false` in `/etc/clubkeep/web.env`, restart `clubkeep-web` only, confirm `/api/auth/capabilities` is empty. Existing password sessions for the platform admin remain.
- Turn `CLUBKEEP_AUTO_DEPLOY` off while pilot clubs are active if you want deploys to be deliberate.
- Rehearse: switch off, confirm, switch on, confirm; time it.

## 6. Open decisions (owner)

1. ~~Pilot sign-up policy~~ Decided: open to all, no gate (G1).
2. ~~Where acceptance runs~~ Decided: on production, with dedicated test accounts and the kill switch ready. There is no staging host, so run the acceptance script before announcing anything to a club.
3. ~~Provider order~~ Decided: Google and email link together, passkeys after.
4. **Pilot clubs (still open).** Which 1 or 2 friendly gyms go first, and who supports them (a WhatsApp number or email owners can reach you on).

## 7. Evidence log (fill in as steps pass)

| Step | Date | Result | Notes (no secrets, no personal data) |
| ---- | ---- | ------ | ------------------------------------ |
|      |      |        |                                      |

## 8. Pilot success criteria (roadmap Phase 2 gate)

5 partner gyms using ClubKeep every week. Track weekly: clubs with at least one check-in, members added, payments recorded, renewals processed, and every support question (these become the polish backlog).
