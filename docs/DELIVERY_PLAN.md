# ClubKeep delivery plan — Business + Personal

**Proposed implementation phases, 9 November 2026.** This is a build roadmap, **not** additional owner-approved monetization or a promise of fixed release dates. Locked scope is in [BUSINESS_SPEC.md](BUSINESS_SPEC.md); tier entitlements in [ENTITLEMENTS.md](ENTITLEMENTS.md), health/ABHA architecture in [HEALTH_INTEGRATIONS.md](HEALTH_INTEGRATIONS.md). The existing club-side [ROADMAP.md](ROADMAP.md) retains its gym-first milestones and 5 pilot gyms milestone.

## Product architecture approach

- Single identity/authentication service and user account that can hold zero, one or many club affiliations. An individual has Personal profile data independent of club enrollment.
- Separate **Business web app** and **Personal web/app surfaces** sharing a design system. Responsive PWA and Android/iOS mobile clients can share an API/domain contract; health-platform collection requires native integration.
- Business and Personal billing entitlements are independent. Paid Growth/Pro clubs can assign a fixed number of sponsored **Personal Pro** seats; assigned users control private health-data sharing.
- Regional and age policy engine must guard features **at the API level**, not solely in UI.
- Keep ClubKeep's original Luxe visual design direction; add a distinct, complementary Personal health experience rather than duplicating a club dashboard.

## Phase 0 — Correct current scaffold (critical prerequisite; detailed plan in [PHASE_0_FOUNDATION.md](PHASE_0_FOUNDATION.md))

**Deliver:** remove simulated phone OTP and console-logged OTPs; implement **Google OAuth, passkeys, short-lived email magic links**, single-use **7-day club invitations/QR** bound to authenticated users, nonunique optional **unverified phone contacts**, verified sessions, Prisma 7 migrations, one shared User + PersonalProfile + ClubMembership model, club role guards, isolated Redis abuse controls, **bare-metal ClubKeep on MenuMinute's existing host**, GitHub-hosted CI and Luxe responsive auth shell. **No SMS provider, Docker or medical modules** in Phase 0. Read [PHASE_0_FOUNDATION.md](PHASE_0_FOUNDATION.md) and [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md).

**Gate:** tests validate Google OAuth, passkey enrollment/sign-in/revocation, email link replay/recovery, atomic invitation claims, nonunique unverified phones, multi-club access denial and clean/upgrade migrations; staging restore and restart cannot interrupt MenuMinute. No Personal medical data in Phase 0.

## Phase B1 — Existing one-month Business MVP preserved

**Deliver:** tenant-isolated clubs and role permissions; 25-member / 1-staff **Free Club** plus existing paid Starter/Growth/Pro tier structures; explicit as-yet-unset Free usage quotas; members and plans, invitation, QR/manual attendance, payment **records**, renewals, ID cards, approved-score club leaderboards, owner overview.

**Gate:** tested onboarding-to-renewal journey with pilot clubs, RBAC/tenant escape testing, no cross-club data access, correct enforcement of known limits. Resolve the unanswered Free quota/owner counting rules before commercial release.

**Do not:** implement marketplace payment processing as a substitute for Club payment records.

## Phase P1 — Independent Personal core (first usable release)

**Deliver:** standalone Personal onboarding and dashboard, essential **Free fitness/wellness** observations, user-owned workouts/measurements, sleep/recovery/nutrition, and **Free limited medical-information vault (insurance, blood type, user-authored biological instructions)**; paid **Pro/Premium** blood-pressure/glucose clinical history, medications and PDF/images of clinical records; encrypted local cache/cloud sync, initial goals/community, 5/50/250 AI allowances, three Personal tiers and compliant web/Apple/Google purchase entitlements. Clinical history must not be stored for Free accounts via generic device imports.

**Native clients:** implement Apple HealthKit and Health Connect permission requests/readers plus a common sync queue; progressive first direct vendor integrations through the connector framework. Persist all authorized history actually exposed by providers. Support only user-created workout/activity writeback.

**Gate:** iOS+Android physical-device permission/revocation and import-history tests; provider-source identity/dedup; offline queue recovery; Private records cannot be viewed by club staff, public achievement pages or ad code. Medical OCR/structured extraction may be phased behind extra verification and security gates even though these record types are in first usable release scope.

**Teens:** age/region policy, guardianship rules where required, restricted social and AI features, private defaults, no authenticated ads, and child-safety testing **before** age-eligible teen launch. If jurisdiction-specific compliance isn't ready, restrict that region/feature rather than falsely claiming it is available.

## Phase P2 — Deeper health records and non-clinical AI

**Deliver:** **paid Pro/Premium** OCR drafts with user sign-off, structured lab/medical records and FHIR exchange on applicable resources, paid medication history, advanced analytics, user-authored care plans, appointment notes and conversational fitness coaching with Groq/NVIDIA NIM. **Free** retains limited private insurance information, blood type and user-entered biological instructions; insurer verification remains separate. Add progress challenges/friends/community on opt-in.

**Gate:** medical extraction quality evaluations against annotated samples; no unverified clinical inference committed to records; explicit per-provider AI consent, consent withdrawal tests, no sensitive model fallbacks, AI caps and vendor cost accounting; private analytics separated from advertising.

**Do not:** represent user-created plans as clinician-authored treatments. **No dedicated clinician accounts** under latest owner direction; any two-way secure messaging with an external clinician requires a separate, explicitly approved recipient authentication design. No such messaging is part of current delivery.

## Phase P3 — India ABHA/ABDM and insurance interoperability

**Deliver:** optional India ABHA link after official eligibility, sandbox test integration and permitted production credentials; patient-authorized record exchange through the proper ABDM consent manager pathways; FHIR/ABDM validation; audit/export of consented records. Insurance information remains a Personal vault; carrier verification/claims require separate approved partners, NHCX/insurer integration and payments workflow.

**Gate:** official sandbox exit/go-live requirements, consent expiry/revocation handling, origin/identity validation, cybersecurity and regulatory assessments. **No claim that ABHA provides universal insurance verification.**

## Phase B2 — Sponsorship and monetization expansion

**Deliver:** Growth/Pro sponsored Pro seat entitlements after exact seat counts are locked, issuance/reassignment/downgrade flows, central usage meters for Free Business and Personal monthly AI requests, renewal/billing failure and refund handlers. AdSense on reviewed, eligible Free **public educational/discovery pages only**, with strict separation from health permissions and sensitive routes.

**Gate:** sponsor does not imply any medical data access; consent revocations work; tests confirm child/ad exclusions, no health-derived pixels or ad requests. App Store/Play purchase entitlements restore across devices.

## Phase M1 — Marketplace (separate transactional product)

**Deliver:** provider profiles, coach discovery, booking, payment orchestration, 15% fee on completed booking, cancellations/disputes/refund accounting, provider payouts, verified marketplace eligibility, regional restrictions.

**Gate:** commission base, withholding/tax, merchant-of-record, KYC/verification and settlement policy selected; payout ledger balanced and idempotent. Do not open clinical provider marketplace until provider verification and local care regulations are reviewed.

## Phase C1 — Separately validated clinical AI; external-recipient messaging remains deferred

**Final clinician account rule:** **No dedicated clinician accounts or portals**. User-owned plans and appointment notes may ship without a clinical actor. In-app verified clinician-to-patient messages remain deferred pending a distinct **external recipient** verification/consent/security decision, which must not create clinician accounts.

**Clinical decision support:** phase separately, with documented intended uses, clinician expertise in evaluation, evidence and bias testing, regulatory classification by geography, incident monitoring and rollback. Health-alert UI gives educational abnormal-reading prompts and clinician follow-up suggestions but **no emergency monitoring service**.

## Cross-cutting Definition of Done

- New capabilities are permission-scoped and subject to explicit age, jurisdiction, provider and plan gates.
- All health and medical access audited; encryption, secret handling, incident response, backup/restore and data deletion/export proven in integration tests.
- Provider adapter integration tests cover token expiry/revocation, backfill, permission changes, deduplication, writeback source provenance, and partial outages.
- AI request ledger atomic, quota enforced server-side and no unconsented data leaves server.
- Non-personalized ad display tested solely in eligible public routes with health-data network isolation.
- Every PR runs CI; migrations reviewable/rollback planned; staging/sandbox before new production partner.
- No user-approved business entitlement is silently revised by engineering; unselected details remain **OPEN**.

## Owner decisions still needed before respective go-live gates

1. If secure external-clinician messaging is pursued, its **non-account recipient** verification/consent model (clinician accounts are prohibited).
2. Exact Free Club monthly quotas, owner/staff counting and club location allowance.
3. Growth and Pro fixed sponsored Personal Pro seat counts and reassignment/stacking policy.
4. Per-vendor entitlement differences and fee coverage, actual wearable/provider API approvals.
5. AI request counting/retries/overages and Premium-specific benefits if any.
6. Marketplace commission base, refunds, chargebacks, payout jurisdiction and provider credentials.
7. Country-specific teen/guardian/clinical features and insurance connector partners.
8. Annual plan rounding and platform tax/fee treatment; ABDM sandbox and go-live approval.
