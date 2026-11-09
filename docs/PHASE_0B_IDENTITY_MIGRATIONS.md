# Phase 0B — Shared identity schema, invitation persistence and reproducible PostgreSQL migrations

**Status:** implementation PLAN only. Last reviewed 9 November 2026 after Phase 0A was squash-merged on `main` as `a636c7ed2013938f92454e57b6c214dba82e55bf`. No schema was migrated on the production VPS. PR 0B should be a separate production-grade implementation PR with migrations and tests, not this planning document.

**Related:** [PHASE_0_FOUNDATION.md](PHASE_0_FOUNDATION.md), [PHASE_0A_IMPLEMENTATION.md](PHASE_0A_IMPLEMENTATION.md), [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md), [BUSINESS_SPEC.md](BUSINESS_SPEC.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Why 0B exists: observed code at merge

The present `prisma/schema.prisma` defines **only** Better Auth `User`, `Session`, `Account`, and `Verification` tables, mapped to lowercase PostgreSQL `user`, `session`, `account` and `verification`. No migration history is committed. Better Auth `User.email` is required and unique, `User.phoneNumber` is optional **but globally unique** due to the legacy OTP plugin, and `User.role` is a global string defaulted to `"user"`. Those fields do not meet the new SMS-free/shared-tenancy rules.

Phase 0A fixed `prisma.config.ts`, Node 24, connection URL fallbacks, GitHub-hosted native-service CI and retired simulated OTP, but **did not** deploy a database or enable the passkey/Google/magic-link flows.

## 2. Locked boundaries

- One canonical Better Auth `User` regardless of ClubKeep Personal and ClubKeep Business. A person can own one club, work at another and be a member of a third without a second global account.
- A **PersonalProfile** is owned by `User`, exists even with **zero club memberships**, is never club-owned, and contains **no medical/insurance/ABHA data in 0B**.
- **No clinician accounts or medical records** are introduced. Free Personal medical scope (insurance details, blood type, user-authored biological instructions only) and paid medical history are **later** Personal work.
- A ClubKeep Business club tenant is separate from the Personal domain. Every club-owned row has a `clubId`; an authenticated user has no permissions in a club without an active matching membership.
- Owner-issued invitations are **single use**, expire by default after seven days, are revocable/reissuable, and grant permission to join only the named club, never phone ownership, global account recovery or clinician access.
- **No SMS.** Phone values are optional unverified contacts, never globally unique at contact level, never used for login, trust elevation or automatic account merging. Optional Google People API phone values are also unverified.
- Passkeys are the intended return sign-in and Google/verified-email magic links are future sign-in/recovery mechanisms. **0B creates compatible storage; 0C configures providers, WebAuthn, email delivery and onboarding UI**.
- Remain bare metal on the existing MenuMinute host eventually, using **separate ClubKeep database and DB roles**. This planning/implementation PR **must not** create, migrate, drop or reset any production database, restart MenuMinute, or send SMTP messages.

## 3. Recommended relational model

The following is the **contract**; exact Prisma syntax and plugin fields are validated against the installed Better Auth versions before merging.

| Table / model | Recommended columns and constraints | Ownership and purpose |
| --- | --- | --- |
| **User** (existing) | Preserve `id`, `name`, `email`, `emailVerified`, `image`, timestamps, auth relations. Review nullable email vs secure invite-bound passkey-first flow before any modification. | Canonical global identity; NOT a club account |
| **Session** (existing) | Preserve `id`, unique `token`, `userId` FK cascade, expiry, timestamps. Index `userId` and expiry if justified. | Auth engine session; verified server-side |
| **Account** (existing) | Preserve original provider fields/token metadata; add `@@unique([providerId, accountId])` **only after** ensuring existing records do not violate it. Index `userId`. | Google and password-linked identities; never key by unverified phone |
| **Verification** (existing) | Preserve `identifier`, `value`, `expiresAt`; add suitable expiry index. Prefer Better Auth verification storage and hashed magic-link tokens in Phase 0C. | Ephemeral auth verification; magic links need no invented standalone table unless plugin requires one |
| **Passkey** | Use `@better-auth/passkey` generated schema as the source of truth: `id`, `userId`, `credentialID`, `publicKey`, `counter`, `deviceType`, `backedUp`, optional `name`, `transports`, `createdAt`, `aaguid`, plugin-specific fields. Unique credential ID, FK to User, user index. | One user has multiple independently revocable passkeys; no raw private keys |
| **PersonalProfile** | `userId` unique FK, locale, timezone, optional display preferences, timestamps; only nonmedical preferences. | User-owned independent Personal state |
| **Club** | `id`, `slug` canonical unique, display `name`, status, optional owner-created metadata, timestamps. No personal medical fields. | Club tenant root, later subscription associations |
| **ClubMembership** | `id`, required `clubId` FK, `userId` FK, role `OWNER/MANAGER/STAFF/MEMBER`, status `ACTIVE/SUSPENDED/LEFT` (invite is **not** membership until claim), joined/left timestamps; unique `(clubId,userId)` and indexed `(userId,status)`, `(clubId,status,role)`. | Club-scoped role assignments; a user's role differs across clubs |
| **ClubInvite** | `id`, `clubId`, `createdByUserId`, `role`, HMAC/keyed-hash of 256-bit random bearer token (unique), token key version, `createdAt`, `expiresAt`, `revokedAt`, `claimedAt`, `claimedByUserId` nullable, limited recipient hint if appropriate, optional approval state. Index club/expiry/status. | One redeemable invitation to one club. Never stores raw invite bearer token |
| **ClubContact** (or agreed equivalent) | `id`, `clubId`, optional `membershipId` and/or `inviteId`, `phoneE164` optional, source `OWNER_ENTERED/USER_ENTERED/IMPORTED`, timestamps, **no unique phone constraint**. | Club-owned unverified contact; cannot establish User identity |
| **SecurityEvent** | `id`, `actorUserId` optional, `clubId` optional, enum event type, safe metadata (strict JSON allowlist), `createdAt`, retention class. | Membership/invite/audit events with no passwords, raw tokens, emails or unnecessary IPs |

### Important design refinements

**Club roster before account claim:** 0B only models identity joins and pending invites. A club owner may eventually create **unclaimed roster entries** in the Business phase; do not create fake global users for them. Either add a separate `ClubMemberRoster` table in B1 or design the optional club contact link carefully; do **not** create a ClubMembership with a fake User. Existing Business Free = 25 members and 1 staff; precise seat-counting and whether owner counts are **OPEN** and must not be hard-coded in 0B.

**Single role vs multiple roles:** For 0B, recommend one effective role per person per club (`@@unique([clubId,userId])`) with owner/manager/staff/member precedence. A future role-grant table is an explicit redesign if simultaneous roles within one club become necessary. Global `User.role` is not trusted for club authorization.

**Last-owner invariant:** Service layer later uses transactional guards for preventing a club with no active Owner. DB constraints guarantee a unique membership, but cannot alone enforce minimum one active owner under all write patterns.

**Invite approval:** Ordinary `MEMBER` invites can be claimed after valid authentication and consumed atomically. Invites to `STAFF/MANAGER/OWNER` require an additional owner-reviewed approval/step-up design; no anonymous URL alone grants privileged role. A forwarded-link risk cannot be eliminated by token expiry. A club owner may revoke member membership, never recover or merge a person's Personal account.

**Passkey-first onboarding without email:** Better Auth's current passkey plugin supports `registration.requireSession: false`, an opaque registration context and `resolveUser` / `afterVerification` hooks. Before implementing, inspect the **exact pinned plugin version** and validate this sequence; existing `User.email String @unique` is required, so passkey-only user creation may need an approved nullable-email-compatible schema or a non-deliverable, unverified, opaque placeholder with strict no-login/no-email behavior. **Do not invent fake verified emails or auto-merge users**. Safe fallback in 0C: authenticate through Google/verified email first, then enroll a passkey. The 0B migrations must not prematurely foreclose the approved no-SMS path.

**Legacy phone fields:** The existing `User.phoneNumber @unique` and `phoneNumberVerified` contain legacy semantics only. Preflight whether the target ClubKeep database contains any actual users. Prefer preserving existing column values, removing the global uniqueness constraint only after examining code and data, and keeping legacy fields read-only/deprecated temporarily instead of deleting them. Move new unverified contact inputs to a club-scoped nonunique table. Do not silently set `phoneNumberVerified = true`.

**Deletion semantics:** `onDelete: Cascade` for auth child sessions/passkeys; club membership/invites/events need deliberate policy so revoking a club owner/member doesn't delete global User/Personal data or compromise audit trail. Prefer a soft-deactivation state for club membership; restrict club deletion while dependent data exists. Ensure permanent user deletion and data export remain possible in a separately designed account-deletion workflow.

## 4. Version and compatibility verification before schema freeze

1. Pin and inspect actual installed versions of `better-auth`, `@better-auth/passkey` and Prisma 7. Do not use a drifting `auth@latest` CLI against an older pinned auth runtime.
2. Generate Better Auth schema for `User/Session/Account/Verification` **plus passkey plugin** in an isolated temp path with an appropriate **pinned** CLI. Diff generated fields, table mappings, field casing and indexes against ClubKeep's lowercase auth tables. Add only compatible changes. Better Auth CLI generates Prisma models but Prisma owns migrations.
3. Validate magic-link schema requirements: the Better Auth verification table may be sufficient; avoid an unsupported custom magic-link table. `storeToken: "hashed"` is the anticipated Phase 0C setting; never store bearer tokens in plaintext.
4. Preserve the existing Prisma 7 generator output (`src/generated/prisma`), Postgres driver adapter and production config from 0A. Do not reinitialize Prisma or upgrade to Prisma 8 merely because `latest` resolves differently.
5. Decide phone legacy and email-nullability policy **in the 0B PR review**, based on code/data and supported Better Auth behavior; provide migration proof, not untested assumptions.

Official references: Better Auth [passkey plugin](https://better-auth.com/docs/plugins/passkey), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [magic-link plugin](https://better-auth.com/docs/plugins/magic-link), [CLI](https://better-auth.com/docs/concepts/cli); Prisma 7 [baselining](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining).

## 5. Migration history design: fresh and existing databases

### Separate, immutable migration files

```text
prisma/
  schema.prisma
  migrations/
    0_init_auth_core/
      migration.sql           # exact current four auth models, indexes and mappings
    20261109_identity_foundation/
      migration.sql           # additive Personal/Club/Passkey/Invite/etc. changes
    migration_lock.toml        # provider = "postgresql", as generated by Prisma
```

Directory names are illustrative. The initial `0_init_auth_core` is the **historical base schema**, not a combined new schema, so an already-populated unversioned ClubKeep auth database can be baselined safely. The second migration makes the additive identity changes; split further if needed for risky index/data changes.

### Case A — new, empty **ClubKeep-only** PostgreSQL database

- A dedicated local/ephemeral database is created by test setup (not the MenuMinute database).
- Apply `prisma migrate deploy` to execute baseline and additive migrations.
- Generate Prisma Client; run integration tests for all constraints and auth model compatibility.
- Apply `migrate deploy` again: it must be a no-op with no data loss.
- Dump/restore a populated synthetic fixture and repeat as the upgrade test.

### Case B — existing ClubKeep auth database without Prisma migrations

- First inspect **that exact ClubKeep database**, actual tables/columns/indexes, count of User/Session/Account rows and whether `_prisma_migrations` exists. **Never assume an existing database is empty.** Never apply this to MenuMinute.
- Compare live schema to `0_init_auth_core`; validate all differences and record an explicit baseline decision. Create backup and an isolated restoration fixture.
- Only when the existing core schema **exactly matches** the reviewed baseline, mark it applied with `prisma migrate resolve --applied 0_init_auth_core` against that authorized ClubKeep DB. This intentionally skips recreating tables and records migration history.
- Run `prisma migrate deploy` to apply subsequent additive migrations, then verify all preexisting users, accounts and sessions remain usable.
- If schema differs, **stop**; design a reviewed reconciliation migration, never force-resolve, reset or silently overwrite.

### Case C — existing database with Prisma migrations

- Inspect `prisma migrate status` and `_prisma_migrations` first, compare checksums/history and production schema. Do not rename/replace migration files already applied.
- If successful migrations already exist, retain canonical history or write an explicit compatibility/reconciliation plan. No resetting history.

### Core production restrictions

- Only `prisma migrate dev` against disposable local development DB. **Production/staging: `prisma migrate deploy` only**, executed once by a migrator with separately limited credentials and deployment lock.
- No `prisma db push`, `migrate reset`, mass truncations or unrestricted `DROP TABLE`. Avoid destructive operations in 0B.
- Every migration includes a reviewed SQL diff, lock/timeout assessment and either safe rollback or restore strategy. Prisma deploy does not guarantee reverse migrations.
- Use **PostgreSQL 17**, matching the audited VPS (`17.11`), on GitHub-hosted testing; native services only, no Docker. If CI uses a different major PostgreSQL version, record that mismatch, ideally run an additional PG 17 job.
- Permissions design: use separate `clubkeep_migrator` and `clubkeep_app` roles. App can read/write only ClubKeep tables, not create/drop them; migrator cannot reach MenuMinute's database. **No production provisioning or grants in 0B**: provide a separately reviewable later host-runbook.

## 6. Transaction and authorization contract (implementation in 0C/0D)

0B should create constraints plus pure helper tests/fixtures where appropriate, **not** expose live invitation redemption routes or enable incomplete authentication.

For later atomic claim:

1. New invitation token: crypto-random **at least 256 bits**; only output once, store **HMAC-SHA-256** keyed hash plus key ID, expiry, issuer, role and revocation data in DB. Do not store token in logs, analytics, search, referer or QR telemetry.
2. The claimant first becomes a genuine authenticated User, or completes a safely validated passkey-first ceremony that *itself* establishes the canonical account. The club invite is **not** sufficient to take over an existing user or recover a device.
3. One DB transaction **conditionally** marks a still-live, nonrevoked invite as claimed (`claimedAt IS NULL AND expiresAt > now()`), creates the membership with unique (`clubId,userId`), records claim actor and safe event. If no row was updated, refuse claim.
4. Under two simultaneous claim requests, at most one succeeds, and failed transactions don't leave stray memberships or consume an invitation without creating the membership.
5. Existing user/member joins are idempotent only under approved policy. An invite for a different user/club must never be silently reassigned.
6. Delete/revoke rights: owner can revoke a pending token or club membership, but not `User`, `PersonalProfile`, passkeys, Google accounts or medical records.

**Time semantics:** 7 days from server creation, UTC-aware. Expiry enforced in transaction query, not dependent on async cleanup. Account/club authorization uses a verified session and active `ClubMembership` (never `User.role`).

## 7. Proposed 0B implementation commits (reviewable in one PR)

| Commit | Scope | Required proof |
| --- | --- | --- |
| **B1 — schema compatibility** | Pin/auth-plugin introspection and minimal core schema changes. Decide email nullable vs approved passkey-first path, safe legacy phone handling, provider identity composite uniqueness. | Generate schema; old auth account fixtures still load |
| **B2 — initial migration** | Check in exact `0_init_auth_core` SQL + lock file + baseline documentation. | New empty DB creates four mapped auth tables |
| **B3 — identity migration** | Add PersonalProfile, Club, ClubMembership, ClubInvite, Passkey, optional ClubContact and limited SecurityEvent; indexes, FKs and role/status enums. | Fresh deploy and upgrade data preservation |
| **B4 — data access foundations** | Club-scoped repository helpers, strict query predicates, typed role/status membership checks, default-deny authorization. No live invite redemption UI. | Cross-club/Personal ownership tests |
| **B5 — CI upgrade** | Real PostgreSQL 17 native CI, migration status/diff checks, deployment repeat, populated fixture upgrade, concurrency/uniqueness tests. | x64 and ARM64 jobs green, no Docker or real secrets |
| **B6 — documentation and operational safety** | Runbooks, schema diagram, migration/baseline/snapshot/restore instructions, migration SQL review, README and AGENTS updates. | New contributor can reproduce empty and legacy upgrades |

No separate clinic/clinician service; no billing, health, wearable, medical-history, insurance, ABHA or Mail-in-a-Box sending logic in this PR.

## 8. Explicit acceptance and adversarial test matrix

| Test | Pass criterion |
| --- | --- |
| Fresh `clubkeep_ci` Postgres 17 DB | All committed migrations apply and Prisma Client generates |
| Second `prisma migrate deploy` | No SQL reapplication or data changes |
| Legacy four-table auth fixture upgrade | Original user/session/account/verification IDs, passwords, token metadata and relationships preserved |
| Alternate/mismatched legacy schema | Baseline halts with documented manual reconciliation; no reset/drop |
| Better Auth model compatibility | Generated plugin schema and Prisma client consistent, no missing passkey field |
| Passkey credential ID duplicate | DB constraint prevents duplicate claim (no private key storage) |
| Same user in Club A and Club B | Allowed; different role/status in each |
| Duplicate membership of same user in same club | Database constraint rejects |
| Club A membership used for Club B | Denied by helper even if caller supplies other `clubId` |
| User with no clubs | Can have PersonalProfile, no club privilege |
| Two clubs use same **unverified** phone contact | Both are accepted, never linked to the same User by phone |
| An unverified phone matches a verified Google user contact | No automatic identity merge |
| One invitation hash reused | Unique constraint; no raw token stored; revocation/expiry considered |
| Parallel redemption attempts (later 0D endpoint) | Only one transaction can consume; prepare concurrency test fixture now |
| Club staff revokes member | Global `User` and PersonalProfile remain intact |
| Owner/staff removes last Owner | Service-level invariant denies (implement when role mutation API ships) |
| Cross-club `User.role` spoof | No authorization effect |
| App role queries MenuMinute tables | Denied once separate role is provisioned in isolated test |
| CI deliberately introduces destructive migration | Migration SQL/security review gate blocks PR |
| No SMTP, SMS, OAuth secret or real host data | Schema and CI checks pass using synthetic credentials |
| ARM64 build after schema changes | Prisma generation, typecheck and standalone Next build green |

**Definition of Done:** an isolated PG 17 test database reproducibly migrates from empty and pre-migration state without data loss; Better Auth passkey storage is compatible with pinned version; unique and FK rules enforce global identity and per-club tenancy; no unverified phone grants identity; no deployed endpoints or medical fields; docs accurately describe pending 0C/0D work. Code changes are not merged until CI and manual migration review pass.

## 9. Release sequencing and handoff

- **0B (this implementation PR):** schema, immutable SQL migrations, tenant/identity helpers and CI tests **in GitHub only**.
- **0C:** Google OAuth, email magic links via existing `mx.bababuilds.com:587` with mandatory STARTTLS, WebAuthn passkey enrollment/sign-in and safe recovery.
- **0D:** transactional 7-day invite issue/revoke/claim, club context switching, membership/role protections; user management UI as appropriate.
- **0E:** deeper rate limiting, anti-enumeration, audit retention, backup recovery and systematic threat tests.
- **0F:** approved bare-metal provisioning and release on MenuMinute host with separate ClubKeep database/roles, isolated Redis security, Nginx/systemd and restoration proof.

## 10. Open items to decide at implementation time, not fabricated here

- Passkey-first anonymous invite registration **with no email**: compatible nullable email or strictly opaque placeholder strategy based on pinned Better Auth version. The user wants passkeys after claiming; Google/verified email first is an acceptable conservative path if passkey-only schema needs redesign.
- Whether new club rostering without a global User belongs entirely in B1 or whether minimal ClubContact is sufficient for 0B.
- Active Owner vs total staff counting under Business Free; number of sponsored Personal Pro seats; precise Free quotas. **Do not bake unapproved values into the schema.**
- Risk acceptance / explicit owner approval policy for forwarded invitations, including privileged roles, and whether one effective role per club suffices.
- Club deletion, security event retention, verified-email changes and global account recovery require separate workflows; 0B only lays safe schema groundwork.

**This document is planning only; it has not run `prisma migrate` against any user database.**
