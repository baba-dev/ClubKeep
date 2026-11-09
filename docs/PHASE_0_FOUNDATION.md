# Phase 0 — Production foundation: identity, authentication, migrations, CI, security

**Status:** Approved for planning, **NOT IMPLEMENTED**. Reviewed against ClubKeep `main` at `6f696fd` on 9 November 2026. This is the proposed execution specification; it does **not** amend subscription prices or authorize the deployment of medical capabilities.

**Product contracts:** [BUSINESS_SPEC.md](BUSINESS_SPEC.md), [ENTITLEMENTS.md](ENTITLEMENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DELIVERY_PLAN.md](DELIVERY_PLAN.md).

## 0. Purpose, boundaries and success definition

**Goal:** replace ClubKeep's attractive but simulated Next.js scaffold with one **real, testable, secure identity and authorization foundation** supporting (a) standalone Personal users, (b) club owners/staff/members and (c) accounts that act in both contexts, while leaving medical and club business modules to later phases.

A user must be able to sign up with a real OTP, receive a genuine session, sign out and sign back in; remain a standalone Personal user; create or join an authorized club test fixture; switch authorized club context; and never access another user's Personal data or another club's data. The same identity works across browser/PWA and later mobile clients; **native token transport is designed, not implemented in Phase 0**.

**Explicit non-goals:** wearables, HealthKit/Health Connect, AI, ABHA/ABDM, full medical vault/history, blood-type and insurance storage UIs, clinician accounts, clinician messaging, public community, payment processing, subscription checkout, production SMS vendor lock-in, full gym onboarding/attendance/payments, marketplace and native Android/iOS applications. No PHI/medical data is to be ingested by Phase 0.

### Superseding business rules (owner clarification on 9 Nov 2026)

- **No clinician-specific accounts, portal or clinical tenant.** The former #22/#24 tension is resolved in favor of *no clinician account*. User-authored care plans and offline/out-of-app appointment notes may exist later. Two-way in-app clinician messaging is **deferred**, not a promised feature, until an explicitly authorized secure **external-recipient** mechanism exists without clinician accounts.
- Personal **Free** still offers essential fitness/wellness tracking and permitted basic activity imports, **but its medical-information vault is limited to insurance information, blood type and user-entered “biological instructions.”** Treat the last as a restricted text field pending clarification of intended meaning—not verified clinical orders or emergency directives.
- Personal **Free has NO medical history** (no lab reports, diagnoses, medications history, clinical observations timeline, PDF clinical reports, OCR/FHIR clinical record management, or ABHA clinical-history exchange). **Pro and Premium/AI** are entitled to medical history once those modules ship; clinical and country-level restrictions still apply. This overrides the portions of Round 2 #16/#19/#21/#31 and older documents that offered medical-document storage, glucose/blood-pressure clinical timelines or full clinical-history import to Free.
- **Free imported fitness/activity history remains** eligible for unlimited permitted source backfill and basic charts. Classify observation types explicitly so clinical records cannot bypass the paid feature restriction via a generic wearable connector. Preserve legally required free access/export/deletion even on downgrade; do not erase or expose a paid medical archive on a plan change.
- Personal prices remain Free ₹0/$0, Pro ₹199/$4, Premium/AI ₹499/$10 monthly, AI allowances 5/50/250 monthly. Business Free remains 25 members and 1 staff; paid club tiers unchanged; Growth and Pro have unchosen numbers of sponsored Personal Pro seats.

## 1. Current-code findings and repairs required

| Repo component | Observed state | Required action |
| --- | --- | --- |
| `src/app/page.tsx` | OTP send/verify displays success after `setTimeout`; never calls auth backend | Replace demo with real client/server auth calls; do not display success before HTTP verification |
| `src/lib/auth.ts` | `sendOTP` prints full phone and secret OTP in logs; `signUpOnVerification` is absent | Add real provider abstraction, dev-only non-production test handler, phone-first verified signup, server-side failures |
| `src/lib/auth-client.ts` | Better Auth client exists | Reuse; provide authenticated session/recovery UX; no separate Personal login |
| `prisma7.config.ts` | Nonstandard Prisma config filename | Rename to root `prisma.config.ts` or pass an explicit config everywhere; standard naming preferred |
| `prisma/schema.prisma` | User/Session/Account/Verification only; global `User.role` string | Compare generated Better Auth schema; add minimal PersonalProfile/Club/ClubMembership and audit; never treat global role as club authorization |
| `prisma/migrations` | No committed migration history | Create reviewed initial migration, then additive migration for foundation domain tables |
| `src/lib/prisma.ts` | Falls back to local DB connection string | Fail closed on missing production `DATABASE_URL`; bound and monitored pool |
| `src/lib/redis.ts` | Redis singleton present; not wired to auth rate limiting | Use atomic distributed throttling with trusted network identity, runtime connection handling |
| `docker-compose.yml` | Dev PostgreSQL/Redis ports exposed on host interfaces by default | Bind to localhost for local development; no production ports exposed |
| `package.json` | No test/typecheck/CI/security scripts; `dotenv` not declared directly despite config import | Lock Node/runtime, add required deps and scripts; keep package-lock synced |
| `.github/workflows` | No workflows present | CI, dependency/security scanning and guarded deploy design |
| `src/app/globals.css` and root page | Boilerplate screen not Luxe app shell | Port approved tokens into usable theme/auth layout without copying demo-data behavior |

Source-of-truth docs: Better Auth phone number plugin, Prisma 7 migration/config, Next.js 16 Proxy/session guidance. Review pinned package APIs in installed version during implementation; do not paste examples for a different version blindly.

## 2. Architecture decisions for implementation (recommended)

### One global user identity

```text
User (canonical auth identity, Better Auth)
 ├── Auth Account(s): email/password and future linked providers
 ├── Session(s): revocable authenticated sessions
 ├── Verified phone identifier (E.164) and optional verified email
 ├── PersonalProfile (0/1; exists without a club)
 ├── ClubMembership (0..many): clubId + userId + role + status
 │     └── Club (club tenant; may have multiple members)
 ├── SecurityEvent / TermsAcceptance (minimal audit/age policy state)
 └── Future: independent Personal medical vault, consent and subscriptions
```

**Do not** create separate Personal and Business users or rely on `User.role` for club authorization. Suggested `ClubMembership` roles: `OWNER`, `MANAGER`, `STAFF`, `MEMBER` and statuses `INVITED`, `ACTIVE`, `SUSPENDED`, `LEFT`. Enforce `UNIQUE(clubId,userId)`; choose club slugs unique and case normalized; use explicit foreign keys, timestamps and appropriate indexes. The Free club seat count is 25 members and one staff; whether owner consumes a staff seat, invited/pending member counts and monthly limits are still OPEN. Do not embed unapproved counts.

**PersonalProfile:** keep it nonmedical in Phase 0: `userId` unique FK, locale, timezone, display name/preferences, creation/update timestamps. Phase 0 may introduce a coarse `agePolicyState` (adult / minor awaiting guardian / eligible minor / restricted) without collecting unnecessary birthdates; verify local-law and consent design before saving age details. Insurance, blood type, biological instructions and clinical history are **not** part of Phase 0 migrations.

**Authorization:** authenticated `userId` from verified session, never from user-controlled JSON. In club operations, resolve `clubId` from route and verify active membership + role on **every** server action/API route and at database query boundary. Owner-only checks enforce not removing the last owner. A user can belong to multiple clubs and switch context; switching doesn't create access to someone else's records. Personal API checks `record.userId === session.user.id`, not a club role. Future permissions distinguish `PERSONAL_FITNESS`, `PERSONAL_BASIC_MEDICAL` and `PERSONAL_MEDICAL_HISTORY` server-side and enforce both feature tier and privacy consent.

**Future portability:** database model does not tie `PersonalProfile` to `Club`; a club member leaving retains their Personal identity and personally owned data. Do not store health or insurance on User/Session or club-owned rows. A paid subscription or sponsored entitlement must never be treated as authorization to health data.

### Identity lifecycle

- Signup: phone-first OTP, normalize to E.164, verify, atomically get/create **one** global user, create PersonalProfile idempotently, mark permitted age state, create session.
- Email/password: preserve existing Better Auth functionality but verify email before treating it as a trusted linking factor. For a phone-first signup Better Auth may require `signUpOnVerification` + generated temporary email because the existing schema requires a unique email. Use reserved non-deliverable aliases derived from server-secret opaque identifiers (never raw phone in an email), mark alias unverified, prevent outgoing mail to alias and replace only upon verified user action. Alternatively adapt schema/plugin after version validation.
- Club invitation: authenticated phone/email claim -> membership created only after verifying the identifier and checking invite validity; **not** auto-linked by name, unverified email, or an imported phone.
- Link another identifier: require a **fresh authenticated session and proof of control of the new identifier**. On collisions between existing accounts, don't auto-merge; provide controlled recovery and support flow.
- Phone-number recycling and SIM swap: enforce step-up for sensitive changes, exports and club ownership; plan stronger future factor/passkey; do not make a sole SMS recovery sufficient for every high-risk action.
- Revocation: logout, revoke all other sessions, account disable, expired/suspended session denial, cleanup verification records.
- Mobile future: use Better Auth-compatible token/session exchange design with OS-protected secure storage, device revocation and CSRF-safe browser sessions; no tokens in URL/localStorage. Don't bolt on an independent native identity.

### UI and route boundaries

- Public: `/`, `/login`, `/register`, relevant legal/support pages.
- Authenticated: `/personal`, `/clubs`, `/clubs/[clubSlug]/dashboard` skeletons (content placeholders only; not complete gym modules).
- App shell: approved Luxe color/typography/tokens, keyboard and reduced-motion support, mobile bottom navigation, loading/error/empty states, no auto-signup after fake OTP.
- Server-only authorization utilities: `requireSession()`, `requireClubRole(clubId, minimumRole)`, `requirePersonalOwner(userId)`, `requireAgeRegionEligibility(feature)` (the last may initially reject restricted features).
- Next.js Proxy is optional for friendly redirects and coarse routing; **never** the sole auth boundary. No sensitive response in shared/static cache; enforce per-user dynamic rendering for personalized routes.

## 3. Delivery slices and acceptance gates

### P0-A — Runtime, environment and local dev

**Deliver** `.nvmrc` and `package.json engines` (standardize on compatible supported Node LTS, suggested Node 24 after verifying dependencies), `npm ci`, committed lockfile, deterministic `npm run typecheck`, `test`, `test:integration`, `test:e2e`, `db:validate` and `db:deploy` scripts. Add `dotenv` explicitly if still used. Align Prisma/Next/Better Auth releases to security-reviewed compatible patches (do not blindly bump major versions). Fix Postgres/Redis Docker local-only port binds, health checks and database readiness. `DATABASE_URL` / `REDIS_URL` may default locally only in an explicitly tagged development environment; never in production. Add typed environment validation with helpful errors, no secret values echoed.

**Gate:** clean clone + documented commands starts services, creates a fresh DB and starts the app; missing required production secrets cause fail-closed startup. Reproducible CI install and build.

### P0-B — Schema and reproducible migrations

**Deliver** proper root `prisma.config.ts`, `prisma validate` and generation, version-compatible Better Auth schema comparison (CLI `generate` for Prisma, not `auth migrate` against a Prisma-managed DB), checked-in baseline SQL migration with mapped existing auth tables and indexes. Subsequent additive migration adds `PersonalProfile`, `Club`, `ClubMembership`, minimal `SecurityEvent`, plus whatever verified better-auth plugin tables/columns actually require. Preserve existing user data if present. Use `prisma migrate dev` only locally; staging/production use `prisma migrate deploy`, with deployment lock/snapshot and expand-contract for future destructive changes.

**Gate:** empty PostgreSQL runs `migrate deploy` + client generate + migration repeat without errors; schema-drift check and a populated upgrade fixture pass; rollback/restore documented. No `db push`, reset or destructive steps in production.

### P0-C — Real authentication

**Deliver** Better Auth send/verify integrated with UI; phone OTP signup + sign-in; verified sessions; optional email/password flow (maintain compatibility, email verification/secure recovery); sanitized, localized errors, resend cooldown, expiration, attempt limits, and accessible keyboard flow. SMS provider boundary (`sendOtp`, mock in tests, real provider configured in production). No `console.log` containing phone/OTP, including unintentional provider exception payloads. Development mock is explicit and unavailable in production. Ensure the provider reports delivery failures rather than showing false success. Reuse existing auth handler at `/api/auth/[...all]`.

**Gate:** real test SMS/OTP proves new user session, repeat login returns same user, wrong/expired/replayed OTP fails, multiple concurrent verification attempts cannot create duplicate users; phone/account collision, malformed E.164 and SMS outage tested. No fake timer responses.

### P0-D — Identity, club authorization and privacy boundary

**Deliver** standalone PersonalProfile automatically created for validated users; empty club list for Personal-only users; protected minimal club creation/member assignment solely to exercise identity; role/membership checks on all club endpoints, no global `User.role` as permission; authorized club switch; irreversible owner safety guards; test-only fixtures with two clubs and members with overlapping identities.

**Gate:** an unauthenticated client receives 401; an authenticated nonmember gets 403 for club-private data; a staff user cannot mutate another club; switching club does not authorize new access; the same person can be a member in Club A and owner in Club B; Personal data never accessible by club role alone. Enforce `UNIQUE(clubId,userId)` under parallel request tests.

### P0-E — Security controls and privacy readiness

**Deliver** OTP request/verify/reset throttling by trusted client IP plus salted/hashed phone key, user/device (where appropriate), distributed atomic Redis-backed enforcement (Better Auth native limits plus provider SMS budget). Explicit reverse-proxy trusted forwarding, safe handling of IPv6, constant-ish account enumeration responses, bounded OTP attempts and cooldown. Configure secure HttpOnly/SameSite cookies and HTTPS-only production, allowed origins/CSRF checks, strict CORS, anti-clickjacking/frame-ancestors, appropriate CSP, security headers, no authentication through untrusted headers, bounded request bodies, secrets scanning, database role least privilege, network separation, encrypted backups and restore. Validate `BETTER_AUTH_SECRET` strength and production base URLs; do not leak secrets in HTML, logs or client env.

**Special:** do not rely on Next Proxy/middleware for authorization; use server-side session and scoped database authorization on every private entry point. Avoid cross-user caching, prefetch and CDN caching for private routes. For medical data later, prepare data classification, data retention/deletion/extraction policy and privacy review, but do not process it now. Teen access: explicit age/region state and restrictive defaults; do not activate social, ads, medical AI or sensitive health integrations before legal/gating work.

**Gate:** automated IDOR/cross-tenant tests, CSRF/origin negative tests, OTP/SMS abuse tests, session fixation/revocation tests, proxy header spoof tests, rate-limit parallel concurrency, basic security scan, no P0/P1 findings before merge.

### P0-F — CI and supply chain

**Deliver** `.github/workflows/ci.yml` on PR/push main, fresh PostgreSQL 16 and Redis 7 services, `npm ci`, validated Prisma generate, lint, format check, TypeScript check, unit/integration tests, safe migration smoke, Next production build and Playwright core browser smoke. Separate dependency vulnerability scan, secret scan, and dependency review on PR. Scope workflow permissions minimally (`contents: read`), pin external actions by reviewed immutable SHA, concurrency cancel superseded PR builds, never supply production credentials to PR jobs, run untrusted forks without write privileges. Dependency update automation with reviewed PRs. Enforce branch protection: all required checks and reviews green before merge; no silent `continue-on-error` for security-critical jobs.

**Gate:** CI fails on deliberate lint/type/test failures, an invalid migration, a cross-tenant test regression, a secret fixture, or an auth regression; `main` cannot accept red checks (repository settings required).

### P0-G — Deployment readiness, observability and recovery

**Deliver** documented staging deployment on ARM64-compatible Linux, minimal service account, isolated Postgres/Redis, HTTPS/reverse-proxy trusted headers, optional WAF only as defense in depth, reviewed release artifacts, systemd or container orchestration strategy (not both until chosen), database migration as a **single deployment-controlled step**, health/readiness endpoints that reveal no private data, structured non-PII logs, error tracking with redaction, auth success/failure metrics, and backup/restoration drills. No automatic database reset or auto-publish from unverified code.

**Gate:** dry-run staging with clean DB + restored fixture, restart/rollback and backup recovery verified; process runs with minimum privileges; no public DB/Redis ports; no leaked OTPs or tokens in error tracking.

### P0-H — Product experience, docs and review

**Deliver** usable Luxe login/register/OTP states, profile and club-picker skeleton, responsive navigation, accessibility/performance smoke. Update README, `.env.example`, architecture/diagrams, migration and deployment runbooks, incident/recovery playbook, auth policy, privacy/consent inventory and developer setup. Mark original fake OTP demo as mockup-only or remove it from the production flow.

**Gate:** real phone signup and Personal-only sign-in works on small-screen and desktop; client sees correct auth/errors; README and CI match actual commands; a new contributor can install and pass green checks.

## 4. Suggested PR split and order

| PR | Scope | Dependency | Must pass |
| --- | --- | --- | --- |
| **0A** | Runtime/env hygiene, DB config, base CI/tests and Docker security | None | clean install + smoke |
| **0B** | Baseline migrations and Better Auth schema compatibility | 0A | schema + fresh DB + upgrade |
| **0C** | Real phone/email auth provider, signed-in UI and session management | 0B | live/simulated-provider auth tests |
| **0D** | PersonalProfile + Club + ClubMembership schema and RBAC/ABAC | 0C | cross-tenant adversarial tests |
| **0E** | Hardening: rate limits, trusted proxy, secrets, headers, cookie/privacy rules | 0C + 0D | attack/abuse tests |
| **0F** | Playwright journeys, release pipeline, staging, backup and docs | 0E | full green & restore test |

The issue names can map to separate PRs or a dependent PR stack. **Do not squash all 0A–0F into one unreviewable change**. Never migrate real medical history data during Phase 0.

## 5. Test matrix and acceptance criteria

| Test | Expected result |
| --- | --- |
| Fresh OTP send + verify | Production delivery confirmed, one user and authenticated session |
| False/expired/replayed OTP | No authentication; bounded retry, safe error |
| 10 simultaneous OTP consumption requests | At most one accepted (verify provider's atomic behavior or enforce transaction/guard) |
| Same verified phone registration twice | One canonical user, no duplicate PersonalProfile |
| Email/phone collision | No automatic unverified account merging |
| Lost or changed device | Explicit session revocation works |
| Sign out then access private endpoint | 401 |
| User A queries user B Personal API | 403 or 404, no data leakage |
| Staff Club A queries Club B by ID/slug | 403 or 404; no data leakage |
| Club A owner + Club B member | Correct per-club permissions; no global owner override |
| Forged proxy IP / Origin / CSRF | Rejected or safely rate-limited |
| 100 concurrent OTP requests | Atomic rate-limit works with Redis, costs bounded |
| Missing production auth secret or SMS provider | Fails closed |
| Fresh and populated migration | Both pass with intact data |
| Private page render/prefetch/cache | Never shares another session's private payload |
| CI deliberate break | Pull request blocked |
| Restored staging backup | User/session/club fixture recovered and app starts |
| Mobile viewport login | Keyboard, errors, button states, focus and WCAG basics work |

**Overall Definition of Done for Phase 0:**
1. Real phone and optional email authentication is secure end-to-end; no simulated OTP and no sensitive console logs.
2. One global identity supports standalone users and multiple club roles, with verified server permissions everywhere.
3. All schema changes have deterministic migrations that apply on a fresh database and an existing database without data loss.
4. A green, required CI pipeline checks lint, types, unit/integration/e2e tests, migrations, build and selected security controls.
5. Staging can recover from a failed deploy and restore its encrypted database backup.
6. No clinical history is stored in the Free medical vault or via bypass; *at this Phase 0 stage, no medical history is stored by the application at all*.
7. All documented decisions and OPEN items are clearly distinguished from shipped functionality.

## 6. Non-code business details still open, NOT blockers to Phase 0

- Precise meaning of **“biological instructions”**, and any associated legal/clinical status.
- What Free users can view after a Pro medical-history downgrade (export/delete rights are preserved; default proposed: encrypted inactive archive without normal paid UI).
- Free Club's exact monthly quotas, whether owner occupies the one staff account, and sponsored-seat counts for paid clubs.
- SMS provider and country delivery coverage/cost, exact OTP delivery and verification budget.
- Regional launch-age bands and parent/guardian verification methods for teens.
- Insurance policy document/storage limits and medical data retention schedule.
- Future external clinician messaging architecture (**no clinician accounts** is final), provider licensing and ABDM go-live.

These items may block the relevant later feature's release, but should **not** distract from a safe and complete Phase 0.

## 7. Pointers to official implementation guidance

- Better Auth phone OTP and `signUpOnVerification`: https://better-auth.com/docs/plugins/phone-number
- Better Auth session behavior and revocation: https://better-auth.com/docs/concepts/session-management
- Better Auth distributed rate-limit storage: https://better-auth.com/docs/concepts/rate-limit
- Prisma 7 config: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- Prisma 7 dev vs production migration commands: https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production
- Next.js 16 Proxy is not an auth boundary: https://nextjs.org/docs/app/getting-started/proxy
- GitHub Actions security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- React/Next.js May 2026 security guidance: https://vercel.com/changelog/next-js-may-2026-security-release

**No runtime code, schema migration, production deployment, medical-data storage or user consent change is authorized by this planning document.**
