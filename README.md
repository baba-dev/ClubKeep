# Clubkeep Boilerplate

A modern, production-ready full-stack web application boilerplate built with Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Better Auth, Prisma ORM 7, PostgreSQL, Redis, Docker Compose, Zod, ESLint, Prettier, and Husky.

---

## Tech Stack Overview

- **Framework**: Next.js 16 (App Router, Turbopack, React 19, TypeScript)
- **Styling & UI**: Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (`Card`, `Button`, `Input`, `Label`, `Sonner` toast)
- **Authentication**: [Better Auth](https://better-auth.com) with PostgreSQL Prisma adapter and built-in **Phone OTP** plugin support
- **ORM & Database**: [Prisma ORM 7](https://www.prisma.io) with PostgreSQL and `@prisma/adapter-pg`
- **Cache & Pub/Sub**: [Redis](https://redis.io) via `ioredis`
- **Local Services**: Docker Compose for PostgreSQL 16 & Redis 7
- **Validation**: [Zod](https://zod.dev) with ready-made auth and phone schemas
- **Code Quality & Git Hooks**: ESLint 9 + Prettier (with Tailwind plugin) + Husky + lint-staged

---

## Project Structure

```
├── .husky/                  # Git hooks (pre-commit: lint-staged)
├── docker-compose.yml       # Local PostgreSQL 16 and Redis 7 services
├── prisma/
│   └── schema.prisma        # Database schema (User, Session, Account, Verification)
├── src/
│   ├── app/
│   │   ├── api/auth/[...all]/
│   │   │   └── route.ts     # Better Auth API handler
│   │   ├── globals.css      # Tailwind v4 styles & theme tokens
│   │   ├── layout.tsx       # Root layout with Geist font & Sonner Toaster
│   │   └── page.tsx         # Interactive starter demo page
│   ├── components/
│   │   └── ui/              # shadcn/ui components (button, card, input, label, sonner)
│   ├── lib/
│   │   ├── auth.ts          # Better Auth server configuration with Phone OTP
│   │   ├── auth-client.ts   # Better Auth client instance (React hooks)
│   │   ├── prisma.ts        # Prisma Client singleton with PG adapter
│   │   ├── redis.ts         # Redis client singleton (ioredis)
│   │   ├── utils.ts         # Utility helpers (cn)
│   │   └── validations/
│   │       └── auth.ts      # Zod validation schemas for auth & OTP
├── .env.example             # Template environment variables
├── eslint.config.mjs        # ESLint flat config with Prettier integration
├── package.json             # Scripts & dependencies
└── tsconfig.json            # TypeScript configuration
```

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Adjust the database credentials or secret keys if necessary.

### 2. Start Local PostgreSQL & Redis

Run Docker Compose in the background:

```bash
docker compose up -d
```

To stop containers:

```bash
docker compose down
```

### 3. Database Schema & Migration

Generate Prisma Client and push the schema to PostgreSQL:

```bash
# Push schema directly to the database
npm run db:push

# Or run Prisma migrations
npm run db:migrate
```

To inspect your database records visually:

```bash
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Phone OTP Authentication

Better Auth is pre-configured with the `phoneNumber` plugin in `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        // Logs OTP in server console for local development
        console.log(`[SMS OTP] To: ${phoneNumber} | Code: ${code}`);
        // For production, integrate your SMS provider (Twilio, AWS SNS, Msg91, etc.)
      },
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
```

Client usage in `src/lib/auth-client.ts`:

```typescript
import { phoneAuth } from "@/lib/auth-client";

// Send OTP to phone
await phoneAuth.sendOtp({ phoneNumber: "+1234567890" });

// Verify OTP
await phoneAuth.verify({ phoneNumber: "+1234567890", code: "123456" });
```

---

## Available NPM Scripts

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start Next.js development server with Turbopack |
| `npm run build`        | Build the Next.js application for production    |
| `npm run start`        | Start the production server                     |
| `npm run lint`         | Run ESLint check                                |
| `npm run format`       | Format entire project using Prettier            |
| `npm run format:check` | Check code formatting                           |
| `npm run db:generate`  | Generate Prisma client types                    |
| `npm run db:push`      | Push schema changes directly to DB              |
| `npm run db:migrate`   | Create and apply Prisma migrations              |
| `npm run db:studio`    | Open Prisma Studio database UI                  |

---

## Git Hooks & Code Quality

Husky and `lint-staged` are configured out-of-the-box:

- On every `git commit`, `lint-staged` runs `eslint --fix` and `prettier --write` on staged TypeScript/JavaScript, JSON, and CSS files.

---

## License

Copyright (C) 2026 [BabaBuilds.com](https://bababuilds.com).

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0-only)** - see the [LICENSE](LICENSE) file for details.
