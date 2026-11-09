# ClubKeep

> Run your club from your phone. Keep your members for life.

ClubKeep is a two-sided platform: **ClubKeep Business** for gyms, sports clubs, yoga and dance studios, and independent **ClubKeep Personal** for health and fitness users with or without a club. They share one account while keeping personal health records independently private.

**Status:** early development. The present code is a scaffold and Luxe design prototypes; Personal, clinical, insurance, wearable and ABHA integrations are product commitments **not shipped features**. The first club-focused release is being built, with no stable API yet.

---

## Why ClubKeep

Small clubs still run on registers, spreadsheets and WhatsApp groups. The tools built for them are often expensive, dated, or made only for owners. ClubKeep aims to be:

- **Beautiful.** A calm, polished interface that owners and members enjoy opening.
- **Quick to start.** Add a member with just a mobile number; no forms or passwords.
- **Affordable.** Low flat monthly plans, with no lock-in and data export at any time.
- **Competitive and social.** Season-based leaderboards that clubs verify themselves.

## Features

### For club owners

- Add and invite members by mobile number
- Membership plans, renewals and member list
- Check-in by QR code, GPS or manual entry
- Payment records for cash, UPI and card fees (ClubKeep records payments; it does not process them)
- Overview of active and lapsing members

### For members

- Sign up and join a club with a mobile number
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
- [Better Auth](https://better-auth.com) with phone OTP sign-in
- [Prisma ORM](https://www.prisma.io) 7 on PostgreSQL
- Redis (via `ioredis`) for caching and counters
- [Zod](https://zod.dev) for validation
- Docker Compose for local PostgreSQL and Redis
- ESLint, Prettier and Husky for code quality

## Getting started

### Prerequisites

- Node.js 20 or newer
- Docker (for local PostgreSQL and Redis)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file and adjust values if needed
cp .env.example .env

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Create the database tables
npm run db:push

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In development, phone OTP codes are printed in the server console instead of being sent as SMS.

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
| `npm run db:push`      | Push the schema straight to the DB     |
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
├── docker-compose.yml       # Local PostgreSQL and Redis
└── AGENTS.md                # Guide for AI coding agents
```

## Documentation

- [Product brief](docs/PRODUCT.md): original gym-first business scope
- [Locked business decisions](docs/BUSINESS_SPEC.md): all 40 Round 1–2 owner choices and unresolved conflicts
- [Pricing and feature matrix](docs/ENTITLEMENTS.md): Personal and Business tiers and sponsorship
- [Wearable, medical, AI and ABHA integrations](docs/HEALTH_INTEGRATIONS.md): technical/privacy gates
- [Delivery phases](docs/DELIVERY_PLAN.md): staged cross-product roadmap\n- [Phase 0 foundation plan](docs/PHASE_0_FOUNDATION.md): secure auth, migrations, identity, CI, tests and staging gates
- [Architecture](docs/ARCHITECTURE.md): stack, data model and rules
- [Roadmap](docs/ROADMAP.md): the first-release build plan
- [AGENTS.md](AGENTS.md): conventions for AI coding agents

## Contributing

ClubKeep is at an early stage. Please open an issue to discuss an idea before sending a pull request. Run `npm run lint` and `npm run format:check` before you push; a pre-commit hook also formats staged files.

## License

Copyright (C) 2026 [BabaBuilds.com](https://bababuilds.com).

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-only)** - see the [LICENSE](LICENSE) file for details.
