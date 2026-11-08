# ClubKeep roadmap

Last updated: 9 Nov 2026. This remains the **Business gym-first** roadmap. ClubKeep Personal has a separate staged plan in [DELIVERY_PLAN.md](DELIVERY_PLAN.md). Round 1–2 decisions are locked in [BUSINESS_SPEC.md](BUSINESS_SPEC.md), with pricing and unresolved caps in [ENTITLEMENTS.md](ENTITLEMENTS.md). Agents pick work from the top unchecked item; do not infer unapproved limits or claim planned health features shipped.

## Phases

| Phase | When                | Goal                                                    | Gate to the next phase                       |
| ----- | ------------------- | ------------------------------------------------------- | -------------------------------------------- |
| 1     | Nov 2026            | Discover and design: interviews, scope lock             | 10 gym-owner interviews done                 |
| 2     | Dec 2026            | One-month solo build of the month-1 scope, 5 partner gyms live | 5 partner gyms using it every week     |
| 3     | Jan to Mar 2027     | Paid launch, pricing tiers live, WhatsApp AI beta       | 20 paying clubs, churn under 3% a month      |
| 4     | Apr to Sep 2027     | Scale: yoga, dance and sports templates, city leaderboards | Growth toward 100 clubs                   |

## Month-1 build order

Cut from the bottom of this list first if time runs short (order of cuts: ID card print layout, GPS check-in, leaderboard visuals). Protect onboarding, QR check-in and payment records.

1. [ ] **Foundations:** app shell, design tokens, mobile navigation, auth with phone OTP working end to end (including an SMS provider for production).
2. [ ] **Clubs and roles:** `Club`, `ClubMember`, role guards, create-a-club flow with vertical template and branding.
3. [ ] **Members and plans:** `Plan`, `Membership`, add or invite a member by phone (`Invite`), member list and renewal status.
4. [ ] **Check-in:** QR (signed rotating token), manual by staff, attendance history.
5. [ ] **Payment records:** record cash, UPI or card payments, dues, receipts.
6. [ ] **Member app:** profile, bio stats history, payment history, my clubs.
7. [ ] **ID card:** digital card page with QR to the member's profile, printable at credit-card size with one default layout.
8. [ ] **Leaderboards:** `Season`, `Activity`, `Kpi`, `Score` with approval, club leaderboard, shareable visual.
9. [ ] **Owner insights:** active vs lapsing members, revenue this month.
10. [ ] **Owner billing:** Razorpay and Stripe behind one interface, tiers and plan limits.
11. [ ] **GPS check-in** (cuttable).
12. [ ] **Polish and deploy:** empty states, errors, mobile QA, production deploy (see `docs/DEPLOYMENT.md`).

## Separate Personal product workstream

- [ ] Shared identity; user-owned Personal domain separate from club tenancy; consent and sponsored entitlement isolation.
- [ ] Personal Free/Pro/Premium-AI with 5/50/250 AI requests and subscription integrations.
- [ ] Personal first usable core: activity, sleep, nutrition, BP, glucose, medications and documents; cloud encryption/offline queue; native Apple Health and Health Connect plus progressive direct vendors.
- [ ] Medical OCR verification/FHIR, insurance vault, India ABHA opt-in consent-based record sync after official approval.
- [ ] Groq/NVIDIA NIM routing with one-time explicit provider consent before identifiable medical payloads.
- [ ] Opt-in challenges/communities; adult-eligible non-sensitive web educational AdSense only; teen age/guardian gates.
- [ ] Growth/Pro sponsored Personal Pro seats after counts decided; Free Club cap 25 members/1 staff with quotas still OPEN.
- [ ] Separate 15% booking-commission coaching marketplace after payment/payout design.
- [ ] Clinician messaging BLOCKED until decision #22/#24 conflict resolved; clinical AI separately validated.

**Gate:** preserve original club roadmap; implement consent, permission, provider, medical and regional safeguards before announcing features live. See [HEALTH_INTEGRATIONS.md](HEALTH_INTEGRATIONS.md).

## After month 1

- WhatsApp AI messaging on Growth and Pro (channel interface, daily caps, approve-before-send).
- City leaderboards across clubs.
- Five ID card layouts for club admins to choose from.
- Yoga, dance and sports templates and their KPIs.
- AI assistant over club data; progress charts and goals.
