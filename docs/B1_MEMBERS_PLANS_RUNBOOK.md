# B1 — Members and Membership Plans

**Scope:** eight feature commits on top of merged Phase 0D. This is an implementation runbook; do not assume successful GitHub CI implies live payment/provider rollout.

## Domain

- `ClubMemberRecord` is tenant-owned. Walk-in registration does **not** create a global User. `ClubMembership` remains the authenticated, club-scoped permission record; linking requires explicit owner/manager selection and approval, never phone/name matching.
- `ClubContact` stores nonunique optional E.164 numbers as **unverified** records. No SMS or global identity merge. PersonalProfile and medical data are never queried by Business B1.
- `ClubPlan` contains plan duration, price **integer minor units**, ISO currency, and archive timestamp. Historical `MemberSubscription` terms snapshot plan name/price/currency and cannot be edited retroactively.
- `MemberSubscription` periods are `[startAt, endAt)`, **exclusive end**. Day/week/month arithmetic uses UTC calendar dates; month end clamps (31 January + one month = 28/29 February). The club timezone and per-club renewal window configuration are later policies; current B1 UI explicitly labels UTC.
- The subscription service acquires a PostgreSQL `SELECT … FOR UPDATE` lock on the member's own roster row before checking/creating terms. Repeated `operationKey` requests return the original result, while distinct concurrent renewals serialize and extend the latest term; audit rows are created in the same transaction.
- Status is derived from dated terms: scheduled / active / expiring within 7 days / expired / cancelled. No payment or revenue is inferred from a term price; external cash/UPI/card **recording** arrives in the next Business phase.

## Entitlements

Approved active member caps: Free 25, Starter 75, Growth 300, Pro unrestricted numerically (fair-use/capacity remain). An active member roster entry counts one seat; a registered active MEMBER account without a linked active roster entry counts one seat. This provisional counting policy avoids duplicate counting and blocks anonymous invite claims and walk-in registration at the same centrally enforced cap. OWNER/MANAGER staff allowances and monthly Free usage quota are **still OPEN**, not silently set here. No tier-switching/billing user interface is exposed. On over-limit, old records remain intact, and new claims/registrations are denied.

## Permissions

- OWNER/MANAGER/STAFF: read member directory and contact details, register/edit members, assign/renew terms.
- OWNER/MANAGER: create/update/archive plans, explicitly link verified accounts, archive members (only after cancelling future terms), cancel terms.
- MEMBER: no Business directory read/write privileges. Global Personal profile independent of club.
- All mutations require Better Auth verified session, exact-origin CSRF gate, isolated Redis rate limit, 4KiB maximum request payload and server-side tenant-role enforcement.

## Migration and go-live

1. Check Phase 0D was merged; ensure the separate ClubKeep database and least-privilege role. Do not run migrations against MenuMinute.
2. Review `prisma/migrations/20261110000000_business_members_plans/migration.sql`: additive enums, club member sequence/tier, roster/plans/subscriptions/events with composite FKs and CHECK constraints. No drops, no Better Auth table alteration.
3. Before live deployment, back up ClubKeep, verify off-host restore independently, run `npm run db:deploy` on isolated target and confirm `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
4. On disposable native PG17 runners, assert cross-club FK denial, unique idempotency keys, immutable pricing and expiry correctness; run all existing legacy preservation checks.
5. Test as a verified owner, manager and staff: create a member, configure a plan, assign, renew twice with competing requests, edit contact, search, link a verified account manually, cancel and archive, then confirm old history intact.
6. Confirm another club cannot access member ID or update plan ID; ensure an unverified phone number is never treated as account ownership.
7. Validate phone layouts at 360px and 390px, tablet and desktop: navigation tabs, searchable cards, accessible form labels, focus indicators, dialogs and error states.
8. Keep public account signup and commercial billing behind their existing independently reviewed gates. Existing ClubKeep release infrastructure and MenuMinute remain isolated; never restart or migrate MenuMinute to deploy B1.

## Known boundaries / next increments

B1 has no automated SMS/WhatsApp reminders, payment collection, club-member fee ledger, club SaaS checkout, attendance, digital ID card, medical features or private Personal data sharing. A single primary ongoing term chain per roster record is supported; class packs / concurrent products need separate future schema changes. Operational pages currently bound displayed results (200 directory, 150 plans, 300 renewal evaluation, 80 term history) and require cursor pagination before onboarding larger Pro clubs; the API/service tier-level enforcement itself has no such list cap.

Business tier quotas beyond active member caps, paid provider verification and default locale/timezone remain owner decisions.
