# B3: Unified Club Experience, multi-vertical onboarding and public discovery

Owner-approved on 11 November 2026. All verticals launch together (GYM, YOGA, DANCE, SPORTS, OTHER). New clubs must finish guided setup before operational access. Public profiles are an early-release opt-in capability, subject to platform moderation. Preserve all existing URL/API contracts and previous locked commercial/privacy decisions.

## Contract
- One Better Auth user, many club-scoped roles. Personal records are completely independent.
- Existing /clubs/[clubId] private routes remain the canonical paths, with a role-aware responsive Luxe layout; /home chooses club context.
- /clubs/new creates an IN_PROGRESS club. The owner is directed to /clubs/[clubId]/setup; the club stays ACTIVE as a tenant lifecycle status, distinct from setup readiness. Existing clubs migrate to LEGACY_ACTIVE so B1/B2 remain operable.
- Setup requires vertical, operating mode, country, currency, timezone, and at least one non-archived plan. Logo, images, public address, and public listing are optional. Owner-only progression is persisted and server-validated. A club can be operated when setup is READY or LEGACY_ACTIVE.
- Protect operational route handlers and pages; reject bypass attempts from NEW clubs (fail-closed). Setup plan creation is a narrowly scoped authenticated exception that calls the existing plan service.
- /discover/clubs and /c/[slug] expose approved public data only. A club must explicitly submit a profile; platform admin must approve. Published content remains unchanged while an edit is pending. Hidden/unlisted profiles are excluded from directory indexing.
- Public discovery does NOT join clubs, reveal member records, or process membership payments. Seven-day single-use /join#invite remains canonical.
- New schema is additive; club statuses, roles, B1 roster/plans/renewals, B2 attendance and age/region/auth feature gates are preserved.
- No new plan quota numbers, sponsored seats, clinical features, class-pack engine, marketplace or platform checkout.

## Security & release
Tenant-scoped writes: verified session, exact-origin CSRF, per-action fail-closed Redis limits, Zod parse, bound payloads, audit logging. Public reads use whitelisted projections and bounded paging. Publishing requires PLATFORM_ADMIN, no implied membership rights. Inactive/suspended clubs are not visible. Do not publish minors or Personal data.

Release gates: immutable migrations on native PG17, fresh/legacy/noop tests, unit and isolation tests, Next 16 standalone startup smoke on ARM64, 360px/390px mobile and tablet check, keyboard/a11y, QR scanner regression and production-side restore rehearsal. ClubKeep's PostgreSQL, systemd, Redis and secrets remain separate from MenuMinute. Public listing can be disabled independently from private club operations.
