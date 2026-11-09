# ClubKeep

> Run your club from your phone. Keep your members for life.

ClubKeep is a two-sided platform: **ClubKeep Business** for gyms, sports clubs, yoga and dance studios, and independent **ClubKeep Personal** for health and fitness users with or without a club. They share one account while keeping personal health records independently private.

**Status:** early development. The present code is a scaffold and Luxe design prototypes; Personal, clinical, insurance, wearable and ABHA integrations are product commitments **not shipped features**. The first club-focused release is being built, with no stable API yet.

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
- [Better Auth](https://better-auth.com): **currently has legacy phone OTP demo; Phase 0 replaces with Google OAuth, WebAuthn passkeys and magic links**
- [Prisma ORM](https://www.prisma.io) 7 on PostgreSQL
- Redis (via `ioredis`) for caching and counters
- [Zod](https://zod.dev) for validation
- **Approved deployment: bare metal alongside MenuMinute**, with distinct PostgreSQL database/role, Redis auth state, Nginx host and systemd service; no Docker
- ESLint, Prettier and Husky for code quality

## Getting started

### Prerequisites

- Node.js 20 or newer
- Locally installed PostgreSQL and Redis services (Docker is **not** part of the approved setup)

### Setup (current scaffold; Phase 0 not implemented yet)

The repository still contains an **outdated phone OTP demo**, `docker-compose.yml` and the nonstandard `prisma7.config.ts`. **Do not use the existing demo as authentication and do not deploy using Docker.** PR 0A will replace the legacy database configuration and provide validated native-service bootstrap steps.

For local source inspection/build, install native PostgreSQL and Redis separately and configure local nonproduction credentials:

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL/REDIS_URL to your own native local services.
# The current Prisma migrations/config need Phase 0A–0B changes before clean DB bootstrapping.
npm run dev
```

The eventual production deployment is an isolated ClubKeep systemd service on the **existing MenuMinute bare-metal server**, sharing the host but not app/database ownership or session secrets. See [the bare-metal plan](docs/BAREMETAL_DEPLOYMENT.md).

**Target authentication (not shipped):** Google OAuth; passkey enrollment and repeat sign-in; short-lived verified email magic links for fallback; single-use seven-day club invitations shared privately or via QR. Phone numbers are optional, nonunique unverified contact details and **never the login factor**. Do not add SMS OTP. The existing demo may falsely display verification success; do not interpret it as a live flow.

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
| `npm run db:push`      | **Legacy dev-only** schema push; do not use on staging/production |
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
├── docker-compose.yml       # Legacy scaffold; planned removal from active workflow
└── AGENTS.md                # Guide for AI coding agents
```

## Documentation

- [Product brief](docs/PRODUCT.md): original gym-first business scope
- [Locked business decisions](docs/BUSINESS_SPEC.md): all 40 Round 1–2 owner choices and unresolved conflicts
- [Pricing and feature matrix](docs/ENTITLEMENTS.md): Personal and Business tiers and sponsorship
- [Wearable, medical, AI and ABHA integrations](docs/HEALTH_INTEGRATIONS.md): technical/privacy gates
- [Delivery phases](docs/DELIVERY_PLAN.md): staged cross-product roadmap
- [Phase 0 foundation plan](docs/PHASE_0_FOUNDATION.md): **SMS-free** Google/passkeys/magic links, secure 7-day invite claim, migrations, identity, CI and tests
- [Bare-metal co-hosting plan](docs/BAREMETAL_DEPLOYMENT.md): ClubKeep on MenuMinute host, isolated systemd, Nginx, DB, Redis security and backup
- [Architecture](docs/ARCHITECTURE.md): stack, data model and rules
- [Roadmap](docs/ROADMAP.md): the first-release build plan
- [AGENTS.md](AGENTS.md): conventions for AI coding agents

## Contributing

ClubKeep is at an early stage. Please open an issue to discuss an idea before sending a pull request. Run `npm run lint` and `npm run format:check` before you push; a pre-commit hook also formats staged files.

## License

Copyright (C) 2026 [BabaBuilds.com](https://bababuilds.com).

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-only)** - see the [LICENSE](LICENSE) file for details.
