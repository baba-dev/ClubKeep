# ClubKeep

> Run your club from your phone. Keep your members for life.

ClubKeep is a two-sided platform: **ClubKeep Business** for gyms, sports clubs, yoga and dance studios, and independent **ClubKeep Personal** for health and fitness users with or without a club. They share one account while keeping personal health records independently private.

**Status:** early development. Phase 0A–0C and initial VPS CI/CD have merged; Phase 0D club onboarding is under review in PR #15. The app includes working authentication/onboarding code, but live provider verification and public registration are separately gated. Personal, clinical, insurance, wearable and ABHA integrations remain planned; Personal, clinical, insurance, wearable and ABHA integrations are product commitments **not shipped features**. The first club-focused release is being built, with no stable API yet.

---

## Why ClubKeep

Small clubs still run on registers, spreadsheets and WhatsApp groups. The tools built for them are often expensive, dated, or made only for owners. ClubKeep aims to be:

- **Beautiful.** A calm, polished interface that owners and members enjoy opening.
- **Quick to start.** Send a one-time club invitation link/QR; member verifies their account through Google, passkey or email link, with no SMS.
- **Affordable.** Low flat monthly plans, with no lock-in and data export at any time.
- **Competitive and social.** Season-based leaderboards that clubs verify themselves.

## Features

### For club owners

- Invite members with revocable single-use seven-day links and in-person QR codes; phone contact is optional and unverified
- Membership plans, renewals and member list
- Check-in by QR code, GPS or manual entry
- Payment records for cash, UPI and card fees (ClubKeep records payments; it does not process them)
- Overview of active and lapsing members

### For members

- Sign up independently or claim a club invitation with Google, passkey or email magic link
- Personal profile with bio stats such as weight, height and measurements
- Digital and printable club ID card with a QR code linking to your profile
- Club leaderboards across four calendar seasons a year, ranked on each activity's own measures

### Planned

- City leaderboards across clubs
- AI-written WhatsApp messages sent from the owner's own number (renewals, class reminders, nudges)
- Templates for yoga, dance and sports academies
- Progress charts and goals

## Approved Personal expansion (not implemented yet)

Personal Free / Pro / Premium-AI will support native Apple Health and Android Health Connect, progressively available direct wearables, AI via Groq/NVIDIA NIM, verified paid medical OCR/FHIR, optional India ABHA consent-based integration, and opt-in community. **Free's medical-information vault contains insurance details, blood type and user-written biological instructions only; medical history/documents require Pro/Premium.** Clinical decision support is a separately validated phase. Business adds a limited Free tier (25 members, 1 staff) without changing existing paid club plan prices.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4 and [shadcn/ui](https://ui.shadcn.com)
- [Better Auth](https://better-auth.com): existing email/password core; **phone OTP demo removed in 0A**; Google OAuth, WebAuthn passkeys and magic links planned for 0C
- [Prisma ORM](https://www.prisma.io) 7 on PostgreSQL
- Redis (via `ioredis`) for caching and counters
- [Zod](https://zod.dev) for validation
- **Approved deployment: bare metal alongside MenuMinute**, with distinct PostgreSQL database/role, Redis auth state, Nginx host and systemd service; no Docker
- ESLint, Prettier and Husky for code quality

## Getting started

### Prerequisites

- Node.js 24.x (Phase 0A uses Node 24.22.0; no global VPS Node upgrade)
- Locally installed PostgreSQL and Redis services (Docker is **not** part of the approved setup)

### Setup (Phase 0A native-service foundation)

Phase 0A establishes Node 24, standard Prisma 7 configuration, CI and native PostgreSQL/Redis instructions. **The app is not ready for public signup**: Google, passkey and magic-link authentication plus invitation redemption are in later PRs. Never deploy the scaffold as a production authentication service.

For local source inspection/build, install native PostgreSQL and Redis separately and configure local nonproduction credentials:

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL/REDIS_URL to your own native local services.
# Phase 0B now contains immutable auth baseline + additive identity migrations.
# Only execute migrations on a disposable ClubKeep-only local DB after review.
npm run db:deploy
npm run db:validate
npm run db:generate
npm run typecheck
npm run test
npm run dev
```

The eventual production deployment is an isolated ClubKeep systemd service on the **existing MenuMinute bare-metal server**, sharing the host but not app/database ownership or session secrets. See [the bare-metal plan](docs/BAREMETAL_DEPLOYMENT.md).

**Authentication implementation:** Google OAuth, passkeys and short-lived verified-email magic links merged in Phase 0C, with live provider activation separately gated. Phase 0D is implementing seven-day single-use club invitations. Phone numbers are optional, nonunique unverified contacts, not login factors. No SMS OTP. Phase 0A removes the misleading developer OTP success UI; signup remains gated until later PRs.

### Useful scripts

| Command                | What it does                           |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Start the development server           |
| `npm run build`        | Build for production                   |
| `npm run start`        | Run the production build               |
| `npm run lint`         | Run ESLint                             |
| `npm run format`       | Format the project with Prettier       |
| `npm run db:generate`  | Generate the Prisma client             |
| `npm run db:migrate`   | Create and apply a Prisma migration    |
| `npm run db:validate`  | Validate Prisma schema without a live connection |
| `npm run db:deploy`    | Apply **reviewed migrations only** (Phase 0B onwards) |
| `npm run typecheck`    | Run TypeScript checks |
| `npm run test`         | Run native Node 24 unit tests |
| `npm run test:integration` | Read-only native PostgreSQL/Redis connection smoke |
| `npm run test:identity` | Real PG17 identity/club/phone uniqueness tests on disposable migrated database |
| `npm run security:audit` | Check production dependencies for critical advisories |
| `npm run db:studio`    | Open Prisma Studio                     |

## Project structure

```
├── prisma/schema.prisma     # Database schema
├── src/
│   ├── app/                 # Next.js routes and API handlers
│   ├── components/ui/       # shadcn/ui components
│   ├── lib/                 # Auth, Prisma, Redis, utilities, Zod schemas
│   └── generated/prisma/    # Generated Prisma client (do not edit)
├── docs/                    # Product, architecture and roadmap notes
├── prisma.config.ts         # Prisma 7 CLI configuration
├── .github/workflows/ci.yml # GitHub-hosted x64 and ARM64 CI
└── AGENTS.md                # Guide for AI coding agents
```

## Documentation

- [Product brief](docs/PRODUCT.md): original gym-first business scope
- [Locked business decisions](docs/BUSINESS_SPEC.md): all 40 Round 1–2 owner choices and unresolved conflicts
- [Pricing and feature matrix](docs/ENTITLEMENTS.md): Personal and Business tiers and sponsorship
- [Wearable, medical, AI and ABHA integrations](docs/HEALTH_INTEGRATIONS.md): technical/privacy gates
- [Delivery phases](docs/DELIVERY_PLAN.md): staged cross-product roadmap
- [Phase 0 foundation plan](docs/PHASE_0_FOUNDATION.md): **SMS-free** Google/passkeys/magic links, secure 7-day invite claim, migrations, identity, CI and tests
- [Phase 0A implementation notes](docs/PHASE_0A_IMPLEMENTATION.md): **merged** in PR #7; audited host baseline, native development setup, green x64/ARM64 CI
- [Phase 0B identity and migrations plan](docs/PHASE_0B_IDENTITY_MIGRATIONS.md): global users, passkeys, tenant roles, seven-day invites, additive and legacy database migrations
- [Phase 0B database runbook](docs/PHASE_0B_RUNBOOK.md): disposable migration validation, populated baseline handling, recovery and production isolation
- [Phase 0B Better Auth compatibility](docs/PHASE_0B_SCHEMA_COMPATIBILITY.md): pinned core/passkey fields, legacy phone and required-email decisions
- [Phase 0C authentication plan](docs/PHASE_0C_AUTHENTICATION_PLAN.md): verified Google, explicit linking, passkeys, five-minute Mail-in-a-Box email links, CI and production activation gates
- [Bare-metal co-hosting plan](docs/BAREMETAL_DEPLOYMENT.md): ClubKeep on MenuMinute host, isolated systemd, Nginx, DB, Redis security and backup
- [Architecture](docs/ARCHITECTURE.md): stack, data model and rules
- [Roadmap](docs/ROADMAP.md): the first-release build plan
- [AGENTS.md](AGENTS.md): conventions for AI coding agents

## Contributing

ClubKeep is at an early stage. Please open an issue to discuss an idea before sending a pull request. Run `npm run lint` and `npm run format:check` before you push; a pre-commit hook also formats staged files.

## License

Copyright (C) 2026 [BabaBuilds.com](https://bababuilds.com).

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-only)** - see the [LICENSE](LICENSE) file for details.
