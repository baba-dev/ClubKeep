# ClubKeep roadmap

Last updated: 12 Nov 2026 (B4 external fee ledger implementation). **All club verticals are available at launch**, as approved in B3. Existing advanced vertical-specific engines remain separately staged. ClubKeep Personal has a separate staged plan in [DELIVERY_PLAN.md](DELIVERY_PLAN.md). Round 1–2 decisions are locked in [BUSINESS_SPEC.md](BUSINESS_SPEC.md), with pricing and unresolved caps in [ENTITLEMENTS.md](ENTITLEMENTS.md). Agents pick work from the top unchecked item; do not infer unapproved limits or claim planned health features shipped.

## Phase 0 foundation first

- [x] **Phase 0A complete in GitHub:** PR #7 merged; Node 24/Prisma 7 config, native-service x64/ARM64 CI and removal of fake SMS OTP demo. No production deployment.
- [x] **Phase 0B merged:** PR #9 (commit `d8b6395b`) added shared identity schema, two Prisma migrations and native PG17/x64/ARM64 tests. **Schema code merged, not deployed to production.**
- [x] **Phase 0C code merged:** [real authentication plan](PHASE_0C_AUTHENTICATION_PLAN.md): Google OAuth with explicit linking, passkeys after verified login, hashed five-minute magic links via self-hosted `mx.bababuilds.com:587` STARTTLS, recovery and abuse controls. No SMS or production provisioning in the code PR.

- [x] **Phase 0D merged in PR #15:** [club onboarding runbook](PHASE_0D_RUNBOOK.md): authenticated club creation, owner role, atomic seven-day invite issue/claim/revoke, local QR, tenant isolation; live provider and policy gates remain.
- [ ] [SMS-free production foundation](PHASE_0_FOUNDATION.md): Google OAuth, passkeys, single-use 7-day invites/QR, email-link recovery, optional nonunique unverified phone contacts, shared global identity, Prisma 7 migrations, club-scoped roles, isolated Redis security, native co-host deployment, GitHub CI and restore tests.
- [ ] **No Phase 0 medical tables**; Free medical vault (insurance information, blood type, user-authored biological instructions) and paid clinical history are later Personal features.
- [ ] No dedicated clinician accounts. Verified two-way external messaging is deferred pending a separately approved non-account model.

## Phases

| Phase | When                | Goal                                                    | Gate to the next phase                       |
| ----- | ------------------- | ------------------------------------------------------- | -------------------------------------------- |
| 1     | Nov 2026            | Discover and design: interviews, scope lock             | 10 gym-owner interviews done                 |
| 2     | Dec 2026            | One-month solo build of the month-1 scope, 5 partner gyms live | 5 partner gyms using it every week     |
| 3     | Jan to Mar 2027     | Paid launch, pricing tiers live, WhatsApp AI beta       | 20 paying clubs, churn under 3% a month      |
| 4     | Apr to Sep 2027     | Scale: advanced yoga, dance and sports capabilities, city leaderboards | Growth toward 100 clubs                   |

## B1 implementation status

- [x] **B1 Members & Membership Plans, merged PR #16:** additive roster and plan schema, club-specific walk-in registration and optional unverified contact, plan CRUD, idempotent term assignment/renewal, central active member limits, mobile-first Luxe UI, native PostgreSQL tests. Full production release requires green CI, verified staging provider and restore gates. See [B1 runbook](B1_MEMBERS_PLANS_RUNBOOK.md).

- [x] **B2 Attendance & Check-in, merged PR #17:** signed short-lived member QR, manual staff check-in, indexed local-day attendance ledger, member pass, history/CSV and Luxe reception UI. [B2 runbook](B2_ATTENDANCE_RUNBOOK.md). Live staging acceptance and policy limits remain.

## B3 / B4 implementation status

- [x] **B3 Unified Club Experience, merged PR #20:** all five verticals, required setup for new clubs, Luxe navigation and opt-in, moderated public club profiles.
- [x] **B4 Finance and Receipts, merged PR #21:** externally received collections, member dues, printable immutable payment snapshots and owner financial views. See [B4 release contract](B4_CLUB_FINANCE.md). This is not gateway processing or statutory invoicing. CI and staging gates apply.

## Month-1 build order

Cut from the bottom of this list first if time runs short (order of cuts: ID card print layout, GPS check-in, leaderboard visuals). Protect onboarding, QR check-in and payment records.

1. [ ] **Foundations:** app shell, Luxe design tokens, mobile navigation and **real Google/passkey/magic-link authentication without SMS**, with owner-issued single-use seven-day invite/QR claims.
2. [ ] **Clubs and roles:** `Club`, `ClubMember`, role guards, create-a-club flow with vertical template and branding.
3. [x] **Members and plans:** `Plan`, `Membership`, invite members via secure single-use links or QR (`Invite`), optional unverified phone contacts, member list and renewal status.
4. [ ] **Check-in:** QR (signed rotating token), manual by staff, attendance history.
5. [ ] **Payment records (B4 PR #21 in review):** externally received cash, UPI or card records, dues, receipts, corrections. No payment gateway settlement.
6. [ ] **Member app:** profile, bio stats history, payment history, my clubs.
7. [ ] **ID card:** digital card page with QR to the member's profile, printable at credit-card size with one default layout.
8. [ ] **Leaderboards:** `Season`, `Activity`, `Kpi`, `Score` with approval, club leaderboard, shareable visual.
9. [ ] **Owner insights:** active vs lapsing members, revenue this month.
10. [ ] **Owner billing:** Razorpay and Stripe behind one interface, tiers and plan limits.
11. [ ] **GPS check-in** (cuttable).
12. [ ] **Polish and deploy:** empty states, errors, mobile QA and isolated bare-metal release alongside MenuMinute (see [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md)).

## Separate Personal product workstream

- [ ] Shared identity; user-owned Personal domain separate from club tenancy; consent and sponsored entitlement isolation.
- [ ] Personal Free/Pro/Premium-AI with 5/50/250 AI requests and subscription integrations.
- [ ] Personal first usable core: Free activity/sleep/nutrition plus limited insurance/blood-type/biological-instructions vault; Pro/Premium BP/glucose clinical histories, medications and medical documents; cloud encryption/offline queue; native Apple Health and Health Connect plus progressive direct vendors.
- [ ] Medical OCR verification/FHIR, insurance vault, India ABHA opt-in consent-based record sync after official approval.
- [ ] Groq/NVIDIA NIM routing with one-time explicit provider consent before identifiable medical payloads.
- [ ] Opt-in challenges/communities; adult-eligible non-sensitive web educational AdSense only; teen age/guardian gates.
- [ ] Growth/Pro sponsored Personal Pro seats after counts decided; Free Club cap 25 members/1 staff with quotas still OPEN.
- [ ] Separate 15% booking-commission coaching marketplace after payment/payout design.
- [ ] No dedicated clinician accounts. External-recipient messaging deferred pending separate design; clinical AI separately validated.

**Gate:** preserve original club roadmap; implement consent, permission, provider, medical and regional safeguards before announcing features live. See [HEALTH_INTEGRATIONS.md](HEALTH_INTEGRATIONS.md).

## After month 1

- WhatsApp AI messaging on Growth and Pro (channel interface, daily caps, approve-before-send).
- City leaderboards across clubs.
- Five ID card layouts for club admins to choose from.
- Yoga, dance and sports templates and their KPIs.
- AI assistant over club data; progress charts and goals.

## B5–B6 delivery update (14 Nov 2026)
- [x] B5 Member Arena: merged PR #24, verified-member self-service, private receipts, member ID, renewal requests. Check production status separately.
- [ ] B6 Club Performance League: eight-slice feature PR (season setup, nonclinical KPI library, opt-in private leaderboards, verified score approval, season challenges, engagement dashboard and native PG17/ARM64 CI). The production gate remains separate from GitHub merge.
- [ ] B7 owner analytics and B8 subscription billing remain future, separately approved phases. Citywide and public leaderboards are **not** in B6.
