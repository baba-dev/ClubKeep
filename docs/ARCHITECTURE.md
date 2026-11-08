# ClubKeep architecture

Last updated: 7 Nov 2026. Sections marked **Proposed** are not built yet; confirm them before running a migration.

## Stack (already set up in the repo)

| Layer      | Choice                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| Framework  | Next.js 16, App Router, React 19, TypeScript (`cacheComponents` enabled)  |
| UI         | Tailwind CSS v4, shadcn/ui, `@base-ui/react`, `lucide-react`, `sonner`    |
| Auth       | Better Auth with the phone-number (OTP) plugin; email/password also on    |
| Database   | PostgreSQL 16 through Prisma 7 and `@prisma/adapter-pg`                   |
| Cache      | Redis 7 through `ioredis`                                                 |
| Validation | Zod 4                                                                     |
| Local dev  | Docker Compose (PostgreSQL and Redis)                                     |
| Quality    | ESLint 9, Prettier with the Tailwind plugin, Husky and lint-staged        |

## Folder map

```
src/app/                 routes, layouts, route handlers (auth lives at app/api/auth/[...all])
src/components/ui/       shadcn/ui components
src/lib/auth.ts          Better Auth server config (phone OTP sendOTP logs to console in dev)
src/lib/auth-client.ts   Better Auth client
src/lib/prisma.ts        Prisma client singleton
src/lib/redis.ts         Redis client singleton
src/lib/validations/     Zod schemas
src/generated/prisma/    generated Prisma client (never edit)
prisma/schema.prisma     schema (currently User, Session, Account, Verification)
```

Design tokens, theme and the `/design` mockup routes are documented in `docs/DESIGN.md`.

Current environment variables (`.env.example`): `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.

## Tenancy and access

- A **club** is the tenant. Users belong to clubs through a membership row with a role (owner, staff, member).
- Every club-owned table has `clubId`. Every server query filters by it, and every mutation checks the caller's role in that club.
- Role checks happen on the server (route handlers, server actions), never only in the UI.

## Proposed data model

Names are suggestions; keep them consistent once chosen. All club-owned models include `clubId`, `createdAt`, `updatedAt`.

| Model              | Purpose                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `Club`             | Name, slug, vertical (gym, sports, yoga, dance), address, location and radius, branding, timezone, country, ID card layout |
| `ClubMember`       | Links `User` to `Club` with role, member number, status, joined date                          |
| `Invite`           | Pending membership keyed by E.164 phone number, claimed on first OTP login                    |
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

Money: integer minor units plus a currency code. Phone numbers: E.164. Timestamps: UTC.

## Key flows

- **Phone onboarding:** owner enters a phone number, an `Invite` is created, the member signs in with an OTP, and the invite is claimed into a `ClubMember`. OTP delivery needs an SMS provider (open decision); in dev the code is logged to the server console.
- **Check-in:** QR carries a signed, short-lived token for the club; GPS compares coordinates to the club's radius on the server; manual is staff-only. All write a `Checkin`.
- **Payment records:** staff record a payment against a member's `Membership`; the dues status is derived from it. No money moves through ClubKeep.
- **Leaderboards:** scores are entered, then approved by club staff. Only approved scores count. Ranks are computed per club, season and activity and cached in Redis sorted sets; PostgreSQL is the record and the cache can always be rebuilt from it.
- **Owner billing:** one billing interface with two providers, Razorpay for India and Stripe elsewhere, chosen by the owner's country. Webhooks update `OwnerSubscription`. Plan limits (members, staff, features) are read from the tier on the server.
- **WhatsApp (later):** a channel interface with a Baileys implementation. A Redis counter per owner per day enforces the tier cap (Growth 50, Pro 200). Messages are AI-personalized from member data and can require approval before sending.

## Security checklist

- Check club membership and role on every server entry point.
- Validate every input with Zod; verify webhook signatures for Razorpay and Stripe.
- Do not log phone numbers, OTP codes, bio stats or tokens.
- Rate-limit OTP requests and check-in attempts using Redis.
- Keep secrets in environment variables; production values never go in git.
- Provide member data export and deletion paths.

## Deployment

See `docs/DEPLOYMENT.md` once written. The target is a self-hosted arm64 Linux server, so every Docker image and native dependency must support `linux/arm64`.
