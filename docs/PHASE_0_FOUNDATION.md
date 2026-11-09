# Phase 0 — SMS-free identity, migrations, CI, security and bare-metal deployment

**Status: staged implementation.** Phase 0A (#7) and Phase 0B (#9) are **merged into GitHub main**; neither is deployed to the production VPS. Phase 0C Google/passkey/magic-link code is not implemented yet; see the [Phase 0C auth plan](PHASE_0C_AUTHENTICATION_PLAN.md). Original repository-audit statements in section 1 describe the pre-0A scaffold and should not be used as today's current code inventory. See [Phase 0B runbook](PHASE_0B_RUNBOOK.md). Revised 9 Nov 2026 based on the owner's new explicit authentication and hosting decisions. The current repository still includes a **fake phone OTP demo**, a phone OTP Better Auth plugin, a Docker Compose development file, and no committed migrations or CI. These legacy files are **to be changed in implementation**, not claims of completed functionality.

Read alongside [BUSINESS_SPEC.md](BUSINESS_SPEC.md), [PRODUCT.md](PRODUCT.md), [ENTITLEMENTS.md](ENTITLEMENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md). If an older document still says "phone OTP", "phone-only sign-up", "Docker" or "new dedicated server", **this revision supersedes it**.

## 0. Owner decisions and constraints now locked

1. **No SMS provider and no SMS OTP login/signup/recovery.** Do not spend on an SMS provider or use a console-logged OTP as a production fallback.
2. **Google Sign-In** for primary identity, using the Google subject (`sub`) plus verified email from an OIDC response where actually provided. Google does **not** reliably provide a phone number in normal OAuth profile claims. Optional Google People API `user.phonenumbers.read` could retrieve a number if available and permissioned, but it is **not proof of phone ownership** and must not be required for registration.
3. **Single-use owner-issued club invite links/QR**, default expiry **7 days**, with club invitation as the proof the club has authorized a prospective member—not proof of the member's phone ownership. Invite-token redemption cannot take over an existing global Personal account.
4. **Phone numbers are optional, unverified contacts** (E.164 where present). Never enforce global uniqueness on unverified contacts or use them to authenticate or merge accounts. Independently verified phone numbers may later use a separate unique registry with reclaim/recycling rules.
5. **Passkeys/WebAuthn** are the main repeat sign-in method; let a new invite claimant enroll a passkey after a secure claim ceremony. Google sign-in and optional verified email magic-link recovery remain available. No staff-controlled reset of a person's Personal account.
6. **Verified phone via inbound WhatsApp** is a future optional idea only. Opening a WhatsApp draft URL is **not** proof: the backend must receive a signed/verifiable incoming message from the claimed sender and match a short-lived one-time challenge. Avoid unofficial Baileys dependence for identity security; a connected business endpoint, API/provider and operational review are necessary.
7. **Bare metal on the same machine as MenuMinute**, not Docker or Docker Compose. Share host CPU/RAM/disk and appropriate infrastructure daemons **but isolate ClubKeep's PostgreSQL database/user, application service, release directories, secrets, Redis security state and logs**.
8. Existing scope remains: **one global user identity** for Personal and Business; no clinician accounts; no medical history on Free (Free medical info limited to insurance information, blood type and user-entered biological instructions); no medical data imported or stored as part of Phase 0. Existing paid club and Personal tier prices unchanged.

**Terminology:** "verified Google identity/email", "verified passkey credential", "club membership authorized by invite" and "phone verified" are separate independent claims. UI and schema must not collapse them into a single generic "verified" flag.

## 1. Repository-specific audit and required changes

| Current file/asset | Current fact | Required Phase 0 change |
| --- | --- | --- |
| `src/app/page.tsx` | Legacy fake phone OTP screen replaced by an honest non-authentication holding page in Phase 0A | Phase 0C implements real Google/passkey/magic-link UI and server-verified states |
| `src/lib/auth.ts` | Phase 0A removes the old phone plugin and OTP logging | Phase 0C configures Google OAuth, passkeys and magic-link plugins; no SMS |
| `src/lib/auth-client.ts` | Phase 0A removes the old phone client plugin | Phase 0C adds Google social login, passkey and magic-link client with one session model |
| `prisma/schema.prisma` | `User.phoneNumber` is globally unique although optional; `User.email` is required; global `User.role` string exists | Move optional *unverified* phone to nonunique contact table; reserve global uniqueness only for independently verified numbers; avoid global role authorization; check Better Auth/passkey schema against installed package version |
| `prisma7.config.ts` | Nonstandard Prisma 7 config file name | Use `prisma.config.ts` and committed Prisma migrations |
| `src/lib/prisma.ts` | Development DB URL fallback | Use strict production config; separate ClubKeep database and role on shared PostgreSQL server |
| `src/lib/redis.ts` | Generic URL and singleton only | Isolate ClubKeep security counters and rate limits, avoid shared evictable MenuMinute cache |
| `docker-compose.yml` | Starts standalone PostgreSQL 16 and Redis 7 containers | Remove/archive from active workflow, replace instructions and tests with **native** PostgreSQL/Redis services |
| `.env.example` | Example points at local Docker defaults and phone OTP setup | Document Google OAuth, passkey origin/RP ID, SMTP provider, PostgreSQL, Redis, app URLs and secrets; never publish actual values |
| `.github/workflows` / test tree | No CI workflow or full tests present | Introduce hosted GitHub Actions CI, tests, migration smoke, SAST/secret/dependency checks |
| `docs/ARCHITECTURE.md`, `README.md`, `AGENTS.md` | Describe phone OTP and Docker | Replace assumptions with this locked plan |
| `src/app/design/luxe` | Approved Luxe design remains mockup | Reuse tokens for responsive login/onboarding and club selector; no simulated security success |

The existing Next.js/React/Tailwind/shadcn and Better Auth/Prisma libraries remain the baseline. Inspect exact installed APIs and security advisories before adding plugins or migrations.

## 2. End-to-end authentication journeys

### A. Standalone Personal sign-up (no club)

1. User chooses **Continue with Google** or **Continue with email**. Google uses verified OpenID Connect claims; email magic link proves control of the mailbox.
2. Better Auth creates or loads one canonical global `User` (Google provider subject and/or verified email, not matching phone text).
3. Create idempotent `PersonalProfile` without any `clubId`. Check age/region restrictions separately; do not activate teen clinical/social features by default.
4. Offer **Create a passkey** (WebAuthn). On capable devices, the OS/password manager may offer biometric or device-PIN unlock. A passkey is cryptographic account proof, not a verified mobile number.
5. Encourage a **second passkey or verified recovery email**. Show recovery methods before the user stores sensitive information in later phases. Sign-in uses Google, passkey or a short-lived email link.

Do not force a phone field or Google People API permission into this path.

### B. Owner invites a club member (7-day single-use link or QR)

1. An authenticated Owner or authorized Manager creates an invitation scoped to **one club**, intended role `MEMBER` by default, expiration at creation + 7 days, creator, status, optional display/contact hint, and a randomly generated **high-entropy bearer token**.
2. Store a **keyed hash** of the invite token, not the raw token. Enforce token type, expiry, revocation and single-use redemption **atomically** in PostgreSQL. Rate limit creation and redemption. The token contains no phone/medical information.
3. Owner shares URL privately via a messenger, email or in-person QR. The URL grants **only the ability to request/join the named club role**. It does not establish identity or verify contact data.
4. After opening the link, claimant authenticates with Google/email, **or** uses a carefully designed invitation-bound passkey-first registration ceremony that creates a canonical user only after successful WebAuthn verification. Do not create a reusable logged-in account merely by visiting the invitation URL.
5. Bind invite redemption transactionally to authenticated `userId` and the club membership; reject replay, expired, revoked and role-escalated invitations. A secure design may require **owner approval** before newly claimed accounts receive full member functions, especially for forwarded links and remote claims.
6. Prompt claimant to create a passkey immediately when feasible and add an email/Google recovery method. Show owner the claimant's selected profile and claim timestamp; permit revocation of **membership**, not deletion/transfer of the person's global account.
7. A lost/shared/forwarded link risks first-claimer abuse. Expose claim/audit/revoke/reissue, use account confirmation when risky, and require explicit authenticated owner approval for `STAFF`, `MANAGER` or `OWNER` role invitations. Never automatically grant a privileged role based on an anonymous token alone.
8. On claim, remove bearer token from browser location via a safe token-exchange POST and replace/history-scrub; set `Referrer-Policy: no-referrer`; never leak invite tokens to pixels, analytics, logs or link previews. Do not embed personal data in QR.

**Guarantees:** Token possession is **invitation authorization**, not proof of SIM or WhatsApp control, not proof of legal identity, and not a credential to recover a linked Personal account.

### C. Return login and device loss

- With passkey: WebAuthn assertion verifies challenge, relying party/origin and registered public key. Allow multiple passkeys, list/revoke individual credentials and terminate sessions on suspected compromise.
- With Google: standard OIDC authentication; do not automatically link on matching *unverified* email or phone. Provider `sub` is stable provider identity.
- With magic link: server sends short-lived, single-use link to a **previously verified and linked** email address; hash token in storage, block replay, suppress account enumeration and rate-limit issuance. The email service is optional only where another recovery method is present.
- Staff may reissue a club invitation **for membership**, but cannot recover an existing Personal account. If the member has no passkey backup and no independently verified recovery credential, old account recovery requires a separately designed support/identity-proof process. The new club invite must not auto-merge or transfer old medical data.
- Encourage a second passkey or verified email before exiting onboarding; when neither exists, clearly disclose possible permanent loss of access. Do not use a previously unverified phone as recovery proof.
- Preserve current email/password login if there are pre-existing users; stop advertising it as default if moving to passkey-first. Decide separately whether *new* password sign-ups remain enabled after testing migration paths.

### D. Phone fields and optional verification

- `ClubMemberContact`: `clubId`, `memberId`, optional E.164 phone, source (owner-entered/user-entered/Google-imported), `verifiedAt=null` by default. The same unverified number can appear on multiple records.
- A separate future `VerifiedPhone` may enforce `UNIQUE(e164)` **after real proof of control**, with revocation, recycling and disputes. Never let owner-entered phones seize/merge identities.
- **Google People API**: optional additional OAuth consent via `user.phonenumbers.read`, only when users deliberately request import. Numbers can be absent, stale or incomplete. They remain **unverified contacts**, never signup or dedup keys. Avoid this permission in initial login to reduce consent friction.
- **WhatsApp later (not Phase 0)**: issue short-lived challenge in ClubKeep UI, open WhatsApp message draft to a legitimate connected business number, **receive inbound message via an authenticated webhook**, verify sender phone or WhatsApp ID + code + expiry + replay protections, then mark a narrower `verifiedVia=whatsapp` status. Prefilled draft/opening alone is insufficient; WhatsApp ownership isn't strong legal identity proof. Check official platform availability/costs and avoid unofficial personal-number automation as security infrastructure.

## 3. Minimum Phase 0 data model and permissions

```text
User (canonical Better Auth user)
 ├─ Account(s): Google OIDC and optional email/password
 ├─ Session(s): revocable, secure and age/region aware
 ├─ PasskeyCredential(s): credentialID unique, public key, counter, status
 ├─ VerifiedEmail / email delivery state (Better Auth compatible)
 ├─ PersonalProfile (0..1; independent of clubs, nonmedical)
 ├─ ClubMembership (0..many; clubId, userId, role, status)
 │     └─ Club (tenant + owner references)
 ├─ ClubInvite (club-scoped, keyed token hash, role, 7-day TTL, redeemedBy)
 ├─ Optional unverified contact(s) (no global uniqueness)
 └─ SecurityEvent, AuditEvent / age-policy flags where necessary
```

- Real schema details must follow installed Better Auth + `@better-auth/passkey` plugin requirements. Generate and review the proposed auth schema before writing Prisma SQL; do **not** run plugin migrations directly against production outside Prisma.
- Existing `User.email String @unique` may require a safe **opaque synthetic placeholder** for passkey-first accounts if the installed auth version cannot support absent email. Such a value is **not a verified email**, must never receive outbound mail, cannot match an account for linking, and should be replaced only after explicit verification. Prefer a native nullable supported design if possible after compatibility review.
- `User.phoneNumber @unique` from old phone OTP schema **must not mean verified phone ownership** and must not block another owner's unverified contact. Migrate carefully if any data exists.
- Club roles: `OWNER`, `MANAGER`, `STAFF`, `MEMBER`; enforce `UNIQUE(clubId,userId)`. Invitation to privileged roles requires an extra owner approval/step-up. Do not use the global `User.role` for club authorization.
- `PersonalProfile` stores only nonmedical basic preferences; future medical, insurance and wearables receive independent user-owned tables and stronger permissions in later phases.
- Any future subscription entitlement is **not** authorization to view another person's health data, and a club sponsor never acquires personal record access.
- Age restrictions are evaluated from explicitly declared age/region state, with guardian flows deferred until policy and implementation meet local law; do not unlock restricted teen features by default.

## 4. Bare-metal deployment alongside MenuMinute

See [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md) for the detailed isolation and operations runbook. **No Docker images, Compose, containerized database or production self-hosted CI runner.**

- **Host:** the existing MenuMinute server, Linux/ARM64 as appropriate to actual host. Before implementation, inspect actual RAM, CPU, swap, disk, inode, CPU load, open ports, PostgreSQL version, Redis processes, restic backups, Nginx sites and systemd units. Do not assume unused port numbers, sufficient capacity or available DB roles.
- **PostgreSQL:** reuse an existing compatible PostgreSQL daemon (reportedly PostgreSQL 17 on the MenuMinute server, **verify live**) but create separate `clubkeep` database, `clubkeep_app` role with least privileges, and dedicated migration permissions. **Never use MenuMinute database, tables or owner role**.
- **Redis:** do **not** use MenuMinute's durable-job queue as ClubKeep auth state; keep ClubKeep throttles and verification challenges in its own **non-evicting Redis security domain** (prefer independent small Redis instance on the same host or a strongly isolated dedicated ACL/DB with proven eviction/availability controls). ClubKeep cache can have a separate namespace; don't allow cache eviction to bypass auth rate limits. If rate-limit backing fails, sensitive invite/auth issuance **fails closed**.
- **Node:** use a compatible Node LTS (the host may already have Node 24), an independent release with pinned dependencies and no shared `node_modules` with MenuMinute. Adopt Next.js standalone output after verifying its server startup and module behavior.
- **Processes:** a non-root `clubkeep` Linux service account, separate systemd `clubkeep-web.service` and an optional separate worker **only if durable email/background jobs need it**. Choose a free loopback port after confirming availability. Nginx terminates HTTPS and proxies only that port. Never expose PG/Redis listeners publicly.
- **Filesystem and secrets:** independent `/var/www/clubkeep/releases/<sha>`, `current` symlink, `/etc/clubkeep/web.env` (root-owned mode 0600), `/var/lib/clubkeep` for durable state and separate log policies. Use a separate auth secret, cookie name/domain, OAuth callback and encryption keys from MenuMinute.
- **Operations:** atomic symlink release, gated migration step, health verification, previous-release rollback for compatible schemas; snapshots/restic and separately restorable ClubKeep DB. Apply cgroup service CPU/memory/I/O protections after measuring headroom; protect MenuMinute from ClubKeep spikes.
- **CI:** GitHub-hosted CI builds/tests the project; production server only receives reviewed release artifacts, not arbitrary PR scripts. Native PostgreSQL/Redis may be provisioned for CI runner tests. Deployment credentials are isolated, minimal and available to protected environments only.

## 5. Implementation order and gated PRs

### P0-A — Runtime, native services, Prisma config and CI baseline

- Confirm target Node version and existing bare-metal PostgreSQL/Redis, runtime packages, open ports and available capacity; write non-destructive audit command checklist. No database mutation until roles/schema reviewed.
- Standardize root `prisma.config.ts`, remove production fallback DB/Redis URLs, add environment schema for Google, SMTP, passkey public RP ID/origin and secrets.
- Remove Docker Compose from required setup/deployment paths; document native PostgreSQL/Redis for developer machines and CI. Keep an optional legacy file only if clearly excluded from deployment and scheduled for deletion.
- `npm ci`, typecheck, lint, format, Prisma validation/generate, initial unit/smoke tests and GitHub-hosted CI. No secret interpolation into PR logs.

**Gate:** clean clone works against native dev services; no Docker requirement; Prisma 7 config recognized; CI green and missing production secrets fail closed.

### P0-B — Better Auth + passkey + invite schema migrations

- Generate Better Auth core/Google/magic link/passkey schema for pinned versions, inspect requirements, create initial immutable SQL migration. Add `Club`, `ClubMembership`, `PersonalProfile`, `ClubInvite`, minimal audit and unverified contact structure.
- Avoid unverified phone `@unique`; ensure only verified ownership is globally unique if feature exists. Add DB uniqueness for passkeys, members, provider identities and invite token hash.
- Test fresh native PostgreSQL and non-empty migration upgrade fixture. Production uses `prisma migrate deploy`, with DB backups and one deploy lock.

**Gate:** repeated migration deploy is idempotent; uniqueness/collision checks and old account migration are safe.

### P0-C — Real Google, magic-link and passkey authentication

- Configure Google Better Auth provider (`openid email profile` only initially), official OAuth state/nonce/callback handling and verified Google identity.
- Integrate `@better-auth/passkey` plugin for enroll, sign-in, list/revoke; support passkey enrollment after invitation-bound account initiation, requiring a valid ceremony/session. Verify WebAuthn RP ID/origin and HTTPS.
- Configure Better Auth magic-link plugin and pluggable email sender (SMTP or API). Hash tokens, short expiry, atomic consume, delivery errors and rate limits. Preserve optional existing password users.
- Replace homepage fake OTP with Luxe login, magic-link confirmation, Google return, passkey registration/sign-in, clear failure/offline/unsupported-device states.

**Gate:** real Google and passkey sessions created; magic links arrive using non-production/prod-capable email sender; replay, wrong origin, invalid credential and callback failures fail safely. No SMS API or OTP logs.

### P0-D — Atomic invite redemption and shared identity RBAC

- Build owner-controlled seven-day token invites with optional display contact hints, QR sharing and secure token exchange.
- Redemptions bound to a real authenticated user or controlled first-passkey ceremony; prevent replay/races, privilege escalation, untrusted phone linking and cross-club access.
- Implement standalone Personal accounts, club context picker, create/join club fixtures and per-club role authorization. Staff can revoke/reissue club membership invites **but cannot reset Personal sign-in**.

**Gate:** two-club adversarial tests, first-claimer risk handling, 100 concurrent redemption attempts yield at most one result, and member role escalation is impossible.

### P0-E — Security and recovery hardening

- Redis-distributed limits for invite create/claim, magic-link issue/verify, login and registration; fail closed if security Redis unavailable. Rate-limit by trusted proxy IP + account/email/device/session dimensions. Lock down Nginx trusted forwarding, CSRF/origin, session cookies, CSP, no-cache private pages, URL token scrub, no PII in logs.
- Verified email/passkey backup, explicit session and passkey revocation, account linking step-up, recovery flow that **never trusts a new invite as authority over an existing account**. Emergency support recovery requires separately defined controls.
- Threat model referral/link forwarding, Google email collision, unverified-phone squatting, passkey platform sync, malicious club owner, age restrictions and native app eventual login bridge.

**Gate:** forged forwarded headers do not bypass throttles, account enumeration prevented, no cross-tenant/Personal disclosure, rate limiting atomic, replay and race tests green.

### P0-F — Bare-metal release, regression E2E, observability and restore

- GitHub hosted pipeline publishes reviewed release artifact; non-root user/systemd; Nginx dedicated hostname/TLS/cookies; dedicated PostgreSQL database; isolated Redis security; health endpoints and service resource bounds.
- Playwright journeys: Personal Google signup, club invite claim, passkey enrollment, return sign-in, magic-link recovery, second device, lost passkey, owner revoke/reissue, cross-club denial and guest/private route denial.
- Tagged ClubKeep restic snapshots, safe migration/restore and rollback drill; app readiness/observability with redacted logs; test MenuMinute continues to operate through ClubKeep deploy and restart.

**Gate:** all auth/recovery/invite tests green, clean database migrates, backup restores, no public DB/Redis port, no resource starvation/cross-app credentials, MenuMinute unaffected.

## 6. Threat and acceptance test matrix

| Scenario | Required expected outcome |
| --- | --- |
| Google callback from wrong audience/state or unverified email | Denied or treated as unlinked appropriately; no account collision |
| Google People API gives no number | Signup succeeds; phone remains unset |
| Google People API supplies number | Optional contact only; not marked verified |
| Two owners register same unverified phone | Allowed, no global account ownership |
| Forwarded invite | Claim has verified account/passkey identity, auditable member role, revoke/owner approval where needed |
| Expired/redeemed/revoked invite | Atomic refusal with no new club membership |
| Two simultaneous redemptions | At most one succeeds |
| Invite link shared publicly | No privileged owner/staff assignment; rate-limited and revocable |
| Invite claimant's device has no WebAuthn | Google/email route works; no locked-in fake session |
| User loses passkey | Google or verified email/backup passkey can recover; staff cannot seize identity |
| Email magic-link replay / expired token | Rejected and sanitized |
| Signup with only unverified phone | Not permitted as an authentication factor |
| Owner searches Personal data | No access absent metric-scoped user permission (future) |
| Club A staff switches to Club B ID | Denied server-side |
| Redis security unavailable | Invite and magic-link issuance cannot bypass limits |
| SQL migration on existing club/user fixtures | No data loss, no schema drift |
| Production ClubKeep crash or runaway load | Service isolated, MenuMinute stays healthy |
| Deploy rollback and restic restore | Independent ClubKeep restoration succeeds |
| CI broken migration/auth/security test | Main merge is blocked |

**Completion definition:** Real Google/passkey/email sessions work, club membership is authorized by single-use invite, unverified phone is never an identity key, one shared user supports Personal and multiple clubs, all DB changes are migrated/reproducible, required CI and security tests pass, native bare-metal deployment isolates ClubKeep from MenuMinute, and recovery does not give club staff control of private Personal accounts.

## 7. Explicit unresolved decisions (do not silently invent)

- **SMTP provider LOCKED:** owner's Mail-in-a-Box at `mx.bababuilds.com`, authenticated port 587 with required STARTTLS and normal certificate verification. Sender mailbox address, password, volume/quotas, credential rotation and bounce handling remain OPEN; never fabricate credentials. PR 0A prepares safe env parsing and connectivity check **without sending messages**; PR 0C wires authenticated magic-link sending.
- Whether to enable an optional People API phone import at all (recommended: **skip during first-release login**); presence does not establish verification.
- Passkey-first anonymous invite enrollment vs requiring initial Google/verified email (recommended: allow invite-bound WebAuthn only after threat-tested flow); whether owner must approve all remote claims or only high-risk claims.
- How to handle genuine account recovery for passkey-only users who lose all factors: must never be club-staff account takeover.
- Exact production hostname, application listening port, existing host capacity and which local Redis instance can be dedicated without disrupting MenuMinute.
- Future WhatsApp inbound verification via official business API/provider, phone recycling semantics and any third-party charges.
- Existing Business Free monthly quotas and staff-seat owner counting; Personal medical record downgrades and biological-instructions semantics remain as separately documented.

## 8. Official reference material (verify pinned versions during implementation)

- Google ID-token fields: https://developers.google.com/identity/openid-connect/reference
- Google People API phone permission: https://developers.google.com/identity/protocols/oauth2/scopes
- Better Auth Google: https://better-auth.com/docs/authentication/google
- Better Auth passkeys: https://better-auth.com/docs/plugins/passkey
- Better Auth magic links: https://better-auth.com/docs/plugins/magic-link
- Better Auth account linking: https://better-auth.com/docs/concepts/oauth
- Prisma 7 config/migrations: https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production
- GitHub Actions hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- Resend Free email limits: https://resend.com/pricing
- Brevo Free email limits: https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan

**No application code, production server configuration, database structure or email/SMS integration is changed by this document.**
