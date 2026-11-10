# ClubKeep architecture

Last updated: 9 Nov 2026. Phase 0B now defines a **versioned schema** in `prisma/schema.prisma` with baseline and additive migrations. See [Phase 0B database runbook](PHASE_0B_RUNBOOK.md) and [schema compatibility](PHASE_0B_SCHEMA_COMPATIBILITY.md). The application remains prelaunch: creating a passkey/invite record is not a live registration or redemption flow. Existing club stack remains early-stage; the revised [SMS-free Phase 0 foundation plan](PHASE_0_FOUNDATION.md) and [bare-metal co-hosting plan](BAREMETAL_DEPLOYMENT.md) define the approved direction. The table below distinguishes existing scaffold components from required replacements. Sections marked **Proposed** are not built yet; confirm them before running a migration.

## Stack (already set up in the repo)

| Layer      | Choice                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| Framework  | Next.js 16, App Router, React 19, TypeScript (`cacheComponents` enabled)  |
| UI         | Tailwind CSS v4, shadcn/ui, `@base-ui/react`, `lucide-react`, `sonner`    |
| Auth       | Better Auth email/password core; SMS OTP removed in 0A. Passkey storage prepared in 0B; Google, passkey and magic-link login in 0C |
| Database   | Prisma 7/adapter-pg; reuse existing host PostgreSQL service (**verify live version and create separate ClubKeep DB/role**) |
| Cache      | ioredis; isolate ClubKeep authentication/security counters from MenuMinute cache/queue |
| Validation | Zod 4                                                                     |
| Local dev  | Native PostgreSQL and Redis, no Compose; Prisma 7 configured in `prisma.config.ts` |
| Quality    | ESLint 9, Prettier with the Tailwind plugin, Husky and lint-staged        |

## Folder map

```
src/app/                 routes, layouts, route handlers (auth lives at app/api/auth/[...all])
src/components/ui/       shadcn/ui components
src/lib/auth.ts          Better Auth core; Phase 0A disables legacy phone OTP, Phase 0C adds Google/passkey/magic links
src/lib/auth-client.ts   Better Auth client
src/lib/prisma.ts        Prisma client singleton
src/lib/redis.ts         Redis client singleton
src/lib/validations/     Zod schemas
src/generated/prisma/    generated Prisma client (never edit)
prisma/schema.prisma     Better Auth core plus Passkey, PersonalProfile, Club, ClubMembership, ClubInvite, ClubContact and SecurityEvent (0B)
```

Design tokens, theme and the `/design` mockup routes are documented in `docs/DESIGN.md`. Binding scope lives in [BUSINESS_SPEC.md](BUSINESS_SPEC.md); [ENTITLEMENTS.md](ENTITLEMENTS.md), [HEALTH_INTEGRATIONS.md](HEALTH_INTEGRATIONS.md) and [DELIVERY_PLAN.md](DELIVERY_PLAN.md) are cross-product specifications.

Current environment variables (`.env.example`): `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.

## Standalone Personal — proposed, not implemented

- One account can have a Personal profile independent of zero or more club memberships. Club-owned rows remain `clubId` scoped; Personal observations, medication, documents, insurance, ABHA link and user-created care plans are **user-owned** and never accessible merely via club membership.
- Store metric-scoped, explicit, revocable grants for any Personal-to-club sharing; sponsored Personal Pro entitlements change features, not permissions.
- Mobile-native HealthKit and Health Connect + direct vendor OAuth adapters; authorized reads; writes restricted to user-created workouts and activities with explicit system permissions and provenance.
- Encrypted cloud sync with encrypted offline mobile caches, conflict handling, provider sync cursor, consent audit, document-source verification and regional/teen safeguards.
- External Groq/NVIDIA NIM model routing uses per-provider explicit consent for identifiable medical payloads, region/privacy eligibility and 5/50/250 monthly AI quotas.
- Business Free 25 members/1 staff with usage quotas, plus original Starter/Growth/Pro plans; Growth/Pro sponsor unknown quantities of Personal Pro seats. Unknown member quota or sponsor counts must not be fabricated.
- Clinical AI remains separately validated; there are **no dedicated clinician accounts**. Two-way messaging is deferred unless an explicitly approved secure external-recipient model works without clinician identities inside ClubKeep.
- Optional India ABDM/ABHA link uses legitimate consent-based health information exchange; ABHA alone neither authorizes access nor verifies insurance policy coverage. Marketplace 15% completed-booking commission uses separate billing/settlement.
- Free Personal's future limited medical-information vault contains **insurance information, blood type and user-authored biological instructions**, but **no medical history**. Pro/Premium medical history and ABDM record exchange require separate eligible releases. These are future services, not features in current Prisma models. Phase 0 adds no medical tables.

## Tenancy and access

- A **club** is the tenant. Users belong to clubs through a membership row with a role (owner, staff, member).
- Every club-owned table has `clubId`. Every server query filters by it, and every mutation checks the caller's role in that club.
- Role checks happen on the server (route handlers, server actions), never only in the UI.

## Implemented Phase 0B identity schema (DB only)

The Prisma 7 migration history is split into immutable `0_init_auth_core`
(the original mapped `user/session/account/verification` tables) and the
transactional `20261109000000_identity_foundation` additive migration.

| Model | Key database rules |
| --- | --- |
| `User` | One global identity; email remains required/unique. Deprecated `role` is **not** club authorization and legacy `phoneNumber` is nonunique/unverified |
| `Account` | Unique `(providerId, accountId)` for a provider's stable Google/credential subject |
| `Passkey` | Unique `credentialID`, linked to User; no private key |
| `PersonalProfile` | `userId` primary key, independent of club, nonmedical |
| `Club` | Unique slug; standalone business tenant |
| `ClubMembership` | Unique `(clubId, userId)`, role OWNER/MANAGER/STAFF/MEMBER, status ACTIVE/SUSPENDED/LEFT |
| `ClubInvite` | Club-scoped, unique keyed token hash, issuer/claimant and expiry/revocation timestamps; **0D redemption and revocation are implemented in PR #15 (unmerged)** |
| `ClubContact` | Optional `phoneE164` deliberately nonunique; never identify or merge users by this contact |
| `SecurityEvent` | Typed event marker with safe minimal references; no tokens or medical information |

Default-deny authorization helpers are in `src/lib/club-access.ts`. They
are not substitutes for verified Better Auth session checks and scoped
server-side database operations when routes are built in 0C/0D.

## Proposed business domain model (not yet implemented)

Names are suggestions; keep them consistent once chosen. All club-owned models include `clubId`, `createdAt`, `updatedAt`.

| Model              | Purpose                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `Club`             | Name, slug, vertical (gym, sports, yoga, dance), address, location and radius, branding, timezone, country, ID card layout |
| `ClubMember`       | Links `User` to `Club` with role, member number, status, joined date                          |
| `Invite`           | Single-use, 7-day, club-scoped invitation token (keyed hash), claimed by authenticated identity; optional unverified phone hint |
| `Plan`             | A club's membership plan: name, price (minor units), currency, duration                       |
| `Membership`       | A member's plan instance: start, expiry, status                                               |
| `PaymentRecord`    | Recorded club fee: member, plan, amount (minor units), currency, method (cash, UPI, card), date, recordedBy |
| `Checkin`          | Member, club, method (QR, GPS, manual), time, optional coordinates                            |
| `MemberProfile`    | Bio stats (weight, height, measurements) with history rows                                    |
| `Activity`         | A rankable activity in a vertical (for example "Deadlift") with its KPIs                      |
| `Kpi`              | Definition of a measure: name, unit, direction (higher or lower is better)                    |
| `Season`           | Calendar season: year, index 1 to 4, start and end dates                                      |
| `Score`            | Member, activity, KPI, season, value, status (pending, approved, rejected), enteredBy, approvedBy |
| `OwnerSubscription`| The owner's ClubKeep plan: tier, provider (razorpay or stripe), provider ids, status, period end |
| `MessageLog`       | Outbound WhatsApp messages for caps, audit and opt-outs (later)                               |

Money: integer minor units plus currency. Optional phone contacts: E.164 where supplied; globally nonunique until independently verified. Timestamps: UTC.

## Key flows

- **SMS-free onboarding:** owners issue single-use, club-scoped 7-day invitation link/QR; claimant authenticates using verified Google, magic link or securely invitation-bound passkey registration, then atomically claims membership. **Link possession does not verify a phone**. Free phone contacts are unverified/nonunique. Google People API phone values are optional and not verified by ClubKeep. Provide recovery through Google, verified email or backup passkeys; staff cannot recover Personal accounts.
- **Check-in:** QR carries a signed, short-lived token for the club; GPS compares coordinates to the club's radius on the server; manual is staff-only. All write a `Checkin`.
- **Payment records:** staff record a payment against a member's `Membership`; the dues status is derived from it. No money moves through ClubKeep.
- **Leaderboards:** scores are entered, then approved by club staff. Only approved scores count. Ranks are computed per club, season and activity and cached in Redis sorted sets; PostgreSQL is the record and the cache can always be rebuilt from it.
- **Owner billing:** one billing interface with two providers, Razorpay for India and Stripe elsewhere, chosen by the owner's country. Webhooks update `OwnerSubscription`. Plan limits (members, staff, features) are read from the tier on the server.
- **WhatsApp (later):** a channel interface with a Baileys implementation. A Redis counter per owner per day enforces the tier cap (Growth 50, Pro 200). Messages are AI-personalized from member data and can require approval before sending.

## Security checklist

- Check club membership and role on every server entry point.
- Validate every input with Zod; verify webhook signatures for Razorpay and Stripe.
- Do not log phone numbers, invite or email-link tokens, passkey challenge secrets, bio stats or session tokens.
- Rate-limit invite creation/claim, passkey operations, email magic-link issuance, Google callback abuse and check-in attempts using isolated Redis security state and server-side checks.
- Keep secrets in environment variables; production values never go in git.
- Provide member data export and deletion paths.

## Deployment

See [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md). Target is the **existing MenuMinute server** with isolated ClubKeep systemd, Nginx host, DB/role, Redis authentication state, secrets and release/backup paths. **No Docker or Compose.** Verify actual ARM64/Node/PostgreSQL resources before provisioning.

## Phase 0D club onboarding implementation (PR #15)

Club creation writes a Club + active OWNER ClubMembership + SecurityEvent in one transaction. Owners/managers issue MEMBER-only 256-bit/HMAC-hashed seven-day invitation tokens; no privileged role upgrade is permitted through the link. Claim uses a PostgreSQL conditional update under a transaction and creates/reactivates the authenticated member row with audit; token reuse and cross-club lookups fail closed. Issuing a QR never sends the token to external services; the token is a URL fragment and submitted via POST after local history scrubbing. Protected API operations require verified Better Auth sessions, exact-origin CSRF checks and isolated Redis throttles. Public preview returns only club name/role/expiry. No new Prisma schema changes are needed. See [Phase 0D runbook](PHASE_0D_RUNBOOK.md).
