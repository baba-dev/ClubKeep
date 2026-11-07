<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ClubKeep: guide for AI coding agents

This file is the single source of truth for Claude Code, Codex and Antigravity. Read it first, then the linked docs for the task at hand.

## What we are building

ClubKeep is a mobile-first platform for gyms (first vertical), sports clubs, and yoga and dance studios. Club owners run their business in one app; members get a profile, ID card and season leaderboards in another. The builder is a solo developer shipping a first release in about one month, so keep every change small and shippable.

Read before coding:

- `docs/PRODUCT.md`: decisions, pricing tiers, feature rules (the source of truth for behavior)
- `docs/ARCHITECTURE.md`: stack, folder rules, proposed data model, security rules
- `docs/ROADMAP.md`: the ordered month-1 task list; pick work from here

If code and docs disagree, stop and ask; do not guess. When a decision changes, update the doc in the same change.

## Stack

Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS v4 with shadcn/ui (`@base-ui/react`), Better Auth (phone OTP), Prisma 7 on PostgreSQL (`@prisma/adapter-pg`), Redis (`ioredis`), Zod 4, Docker Compose locally. `next.config.ts` enables `cacheComponents` and `partialPrefetching`, so read the Next.js docs in `node_modules/next/dist/docs/` before writing data fetching or caching code.

## Commands

```bash
npm run dev            # dev server
npm run lint           # ESLint (run before finishing)
npm run format:check   # Prettier check; use `npm run format` to fix
npm run build          # production build (run before finishing larger changes)
npm run db:generate    # regenerate Prisma client after schema edits
npm run db:migrate     # create/apply a migration (preferred over db:push for real changes)
docker compose up -d   # local PostgreSQL 16 and Redis 7
```

A Husky pre-commit hook runs `eslint --fix` and `prettier --write` on staged files.

## Non-negotiable rules

1. **Multi-tenant by club.** Every club-owned row carries a `clubId`, and every query and mutation is scoped to the caller's club and checked against their role on the server. Never trust a `clubId` sent by the client without checking membership.
2. **ClubKeep never processes club payments.** Club fees paid by members (cash, UPI, card) are only recorded in a ledger. Do not add payment collection for club fees. Only owner subscriptions to ClubKeep are billed: Razorpay for India, Stripe elsewhere, behind one billing interface.
3. **Money is stored as integer minor units plus a currency code.** Never use floats for money.
4. **Phone numbers are stored in E.164 format** (for example `+919876543210`) and validated with Zod before use.
5. **Leaderboards count only club-approved scores** from members attached to a club. The club is the verification authority.
6. **WhatsApp messaging** goes through a channel interface, is available on Growth and Pro plans only, and is capped per owner per day (Growth 50, Pro 200). Messages go only to members who joined, with opt-out and an approve-before-send mode. Baileys is an unofficial library, so keep it behind the interface so it can be swapped.
7. **Member data is sensitive** (bio stats are health-adjacent). Collect only what the feature needs, never log phone numbers, OTP codes or bio stats, and keep export and delete paths possible.
8. **Secrets stay out of git.** Never commit `.env`; add new variables to `.env.example` with a safe placeholder.

## Code conventions

- TypeScript strict; no `any` without a comment explaining why.
- Validate all external input (forms, route handlers, webhooks) with Zod schemas in `src/lib/validations/`.
- Use the Prisma singleton in `src/lib/prisma.ts` and import types from `src/generated/prisma`. Never edit `src/generated/`.
- Use the Redis singleton in `src/lib/redis.ts`. Redis is for caching, rank sorted sets and counters, never the system of record.
- UI: build with shadcn/ui components in `src/components/ui/` and Tailwind tokens from `src/app/globals.css`. Design is a core product value: calm, consistent spacing, no default-looking screens. Every screen must work one-handed on a phone first.
- Prefer server components and server actions or route handlers; keep client components small.
- Dates are stored in UTC. Seasons are fixed calendar quarters; the exact months are an open decision in `docs/PRODUCT.md`.
- Keep files small and named by feature; add comments only where the why is not obvious.

## Working agreements

- Work in small steps from `docs/ROADMAP.md`; one feature per branch or commit.
- Do not add a dependency without saying why in your summary.
- Do not change the Prisma schema without a migration and an update to `docs/ARCHITECTURE.md`.
- Run `npm run lint` and `npm run build` before declaring work done; say plainly if you could not run them.
- Never run destructive database commands (`migrate reset`, `db push --force-reset`) without explicit approval.
- Prisma skills are in `.agents/skills/` and `.claude/skills/`; use them for Prisma 7 specifics.

## Tool notes

- **Claude Code** reads `CLAUDE.md`, which imports this file.
- **Codex** reads `AGENTS.md` directly.
- **Antigravity** also reads `AGENTS.md`; if your version only reads `GEMINI.md` or its own rules folder, add a one-line file there that points to this one.
