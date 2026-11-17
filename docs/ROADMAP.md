# ClubKeep roadmap

Last updated: 17 Nov 2026 (status sync after B6, HM2, lean releases and Node 26; no new product scope). Merged to `main` is **not** deployed: production feature flags remain off. **All club verticals are available at launch**, as approved in B3. Existing advanced vertical-specific engines remain separately staged. ClubKeep Personal has a separate staged plan in [DELIVERY_PLAN.md](DELIVERY_PLAN.md). Round 1–2 decisions are locked in [BUSINESS_SPEC.md](BUSINESS_SPEC.md), with pricing and unresolved caps in [ENTITLEMENTS.md](ENTITLEMENTS.md). Agents pick work from the top unchecked item; do not infer unapproved limits or claim planned health features shipped.

## Phase 0 foundation first

- [x] **Phase 0A complete in GitHub:** PR #7 merged; Node 24/Prisma 7 config, native-service x64/ARM64 CI and removal of fake SMS OTP demo. No production deployment.
- [x] **Phase 0B merged:** PR #9 (commit `d8b6395b`) added shared identity schema, two Prisma migrations and native PG17/x64/ARM64 tests. **Schema code merged, not deployed to production.**
- [x] **Phase 0C code merged:** [real authentication plan](PHASE_0C_AUTHENTICATION_PLAN.md): Google OAuth with explicit linking, passkeys after verified login, hashed five-minute magic links via self-hosted `mx.bababuilds.com:587` STARTTLS, recovery and abuse controls. No SMS or production provisioning in the code PR.

- [x] **Phase 0D merged in PR #15:** [club onboarding runbook](PHASE_0D_RUNBOOK.md): authenticated club creation, owner role, atomic seven-day invite issue/claim/revoke, local QR, tenant isolation; live provider and policy gates remain.
- [ ] [SMS-free production foundation](PHASE_0_FOUNDATION.md) (code merged; **production provider enablement, staging acceptance and restore drill still open**): Google OAuth, passkeys, single-use 7-day invites/QR, email-link recovery, optional nonunique unverified phone contacts, shared global identity, Prisma 7 migrations, club-scoped roles, isolated Redis security, native co-host deployment, GitHub CI and restore tests.
- [ ] **No Phase 0 medical tables**; Free medical vault (insurance information, blood type, user-authored biological instructions) and paid clinical history are later Personal features.
- [ ] No dedicated clinician accounts. Verified two-way external messaging is deferred pending a separately approved non-account model.

## Phases

| Phase | When            | Goal                                                                   | Gate to the next phase                  |
| ----- | --------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| 1     | Nov 2026        | Discover and design: interviews, scope lock                            | 10 gym-owner interviews done            |
| 2     | Dec 2026        | One-month solo build of the month-1 scope, 5 partner gyms live         | 5 partner gyms using it every week      |
| 3     | Jan to Mar 2027 | Paid launch, pricing tiers live, WhatsApp AI beta                      | 20 paying clubs, churn under 3% a month |
| 4     | Apr to Sep 2027 | Scale: advanced yoga, dance and sports capabilities, city leaderboards | Growth toward 100 clubs                 |

## B1 implementation status

- [x] **B1 Members & Membership Plans, merged PR #16:** additive roster and plan schema, club-specific walk-in registration and optional unverified contact, plan CRUD, idempotent term assignment/renewal, central active member limits, mobile-first Luxe UI, native PostgreSQL tests. Full production release requires green CI, verified staging provider and restore gates. See [B1 runbook](B1_MEMBERS_PLANS_RUNBOOK.md).

- [x] **B2 Attendance & Check-in, merged PR #17:** signed short-lived member QR, manual staff check-in, indexed local-day attendance ledger, member pass, history/CSV and Luxe reception UI. [B2 runbook](B2_ATTENDANCE_RUNBOOK.md). Live staging acceptance and policy limits remain.

## B3 / B4 implementation status

- [x] **B3 Unified Club Experience, merged PR #20:** all five verticals, required setup for new clubs, Luxe navigation and opt-in, moderated public club profiles.
- [x] **B4 Finance and Receipts, merged PR #21:** externally received collections, member dues, printable immutable payment snapshots and owner financial views. See [B4 release contract](B4_CLUB_FINANCE.md). This is not gateway processing or statutory invoicing. CI and staging gates apply.

## Month-1 build order

Cut from the bottom of this list first if time runs short (order of cuts: ID card print layout, GPS check-in, leaderboard visuals). Protect onboarding, QR check-in and payment records.

1. [x] **Foundations (code merged, providers off in production):** app shell, Luxe design tokens, mobile navigation and **real Google/passkey/magic-link authentication without SMS**, with owner-issued single-use seven-day invite/QR claims.
2. [x] **Clubs and roles (Phase 0D, B3):** `Club`, `ClubMember`, role guards, create-a-club flow with vertical template and branding.
3. [x] **Members and plans:** `Plan`, `Membership`, invite members via secure single-use links or QR (`Invite`), optional unverified phone contacts, member list and renewal status.
4. [x] **Check-in (B2, PR #17):** QR (signed rotating token), manual by staff, attendance history.
5. [x] **Payment records (B4, PR #21):** externally received cash, UPI or card records, dues, receipts, corrections. No payment gateway settlement.
6. [x] **Member app (B5, PR #24):** payment history, receipts, my clubs, renewal requests. Bio-stats history is intentionally not built; it is health-adjacent and needs a separate decision.
7. [x] **ID card (B5, one default layout; print layout needs device QA):** digital card page with QR to the member's profile, printable at credit-card size with one default layout.
8. [x] **Leaderboards (B6, PR #25):** private opt-in club leaderboards; no public or shareable visual in B6.
       Original scope: `Season`, `Activity`, `Kpi`, `Score` with approval, club leaderboard, shareable visual.
9. [ ] **Owner insights (basic overview shipped in HM2-A; B7 adds trends and lapsing):** active vs lapsing members, revenue this month.
10. [ ] **Owner billing:** Razorpay and Stripe behind one interface, tiers and plan limits.
11. [ ] **GPS check-in** (cuttable).
12. [ ] **Polish and deploy (release tooling done, see below; UX polish and pilot go-live open):** empty states, errors, mobile QA and isolated bare-metal release alongside MenuMinute (see [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md)).

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
- [x] B6 Club Performance League: merged PR #25 (season setup, nonclinical KPI library, opt-in private leaderboards, verified score approval, season challenges, engagement dashboard and native PG17/ARM64 CI). The production gate remains separate from GitHub merge.
- [ ] B7 owner analytics and B8 subscription billing remain future, separately approved phases. Citywide and public leaderboards are **not** in B6.

## Platform and design updates (14–17 Nov 2026)

- [x] Safe full-product demo and onboarding repair, merged PR #26 ([DEMO_AND_ONBOARDING.md](DEMO_AND_ONBOARDING.md)).
- [x] Human Motion 2.0 visual pass: HM2-A owner dashboard (#29), HM2-B club operations (#30), HM2-C member, onboarding and public (#31), demo visual and release readiness (#32). See `docs/design/`. `DESIGN.md` now names HM2 as the governing system (owner decision, 17 Nov 2026); Luxe is superseded history.
- [x] Lean release artifacts v2 (#33, [LEAN_RELEASES_V2.md](LEAN_RELEASES_V2.md)) and Node 26 central runtime cutover (#34, [NODE26-CENTRAL-RUNTIME.md](NODE26-CENTRAL-RUNTIME.md)): deploy tooling only, no product change.
- [x] B7 owner insights, merged PR #35 with a PG17 integration test ([B7_OWNER_INSIGHTS.md](B7_OWNER_INSIGHTS.md)). Deployed by CI on merge; phone and screen-reader QA still open.
- [ ] **In progress:** pilot go-live gate, tracked in [PILOT_GO_LIVE.md](PILOT_GO_LIVE.md) (owner decisions 17 Nov: open sign-up with no gate, test on production, Google and email link together).
- [ ] **B8 club billing** (plan approved 17 Nov 2026, [B8_BILLING.md](B8_BILLING.md)): B8-1 engine implemented on a feature branch (flag off); next B8-2 owner billing UI, B8-3 complimentary-tier and reconcile tooling, B8-4 Stripe. Launch gates: tax adviser sign-off and a Razorpay test-mode end-to-end run.
