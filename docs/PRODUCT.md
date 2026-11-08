# ClubKeep product brief

Last updated: 9 Nov 2026 (Rounds 1–2 reconciled; original club scope preserved). This is the source of truth for product behavior. Change it in the same commit as the code.

## Scope expansion: ClubKeep Personal + Business (Rounds 1–2 locked, 9 Nov 2026)

ClubKeep is now a two-sided platform: **ClubKeep Personal** (a standalone B2C health, wellness, fitness, medical-record and clinician-workflow product) and **ClubKeep Business** (the existing B2B club management product), using one shared user identity. Personal is useful without joining a club. See [BUSINESS_SPEC.md](BUSINESS_SPEC.md) for **all 40 locked Round 1/2 decisions**, insurance and India ABHA scope; [ENTITLEMENTS.md](ENTITLEMENTS.md) for Personal/Business tier matrices; [HEALTH_INTEGRATIONS.md](HEALTH_INTEGRATIONS.md) for provider/medical/AI safeguards; and [DELIVERY_PLAN.md](DELIVERY_PLAN.md) for delivery sequencing.

**Precedence:** This 9 Nov 2026 addition supersedes earlier assumptions that individuals only use ClubKeep through clubs, that all club owners must start on a paid plan, or that the Personal experience is exclusively free. Existing Starter/Growth/Pro club prices and stated features remain unchanged. Business Free is **25 members / 1 staff account**, with core workflows and as-yet-unfixed monthly quotas; Growth/Pro get fixed but currently unspecified numbers of sponsored Personal Pro seats. Personal Free/Pro/Premium-AI are distinct subscription tiers. **Do not interpret planned features as implemented.**

## Vision

ClubKeep is a polished, mobile-first operating system for small fitness and activity clubs. Owners run the whole business from one app, and members keep their own progress in another.

- **Pitch:** Run your club from your phone. Keep your members for life.
- **North-star metric:** weekly active members per paying club.
- **Market:** global from day one. India uses INR pricing and Razorpay; the rest of the world uses USD pricing and Stripe.
- **First vertical:** gyms. Sports clubs, yoga and dance studios follow on the same engine with their own templates.
- **Build:** solo developer, first release in about one month.

## Principles

1. Beauty is the product: a calm, polished UI is a feature.
2. Save the owner's time first. Target: a new club is live in under 30 minutes.
3. Two sides, one loop: owners run the club, members track themselves, and member progress feeds owner insight.
4. One core, vertical flavors: shared engine, per-vertical templates and vocabulary. No generic ERP.
5. Mobile-first and low-friction: one-handed use, weak networks, one-tap or one-scan check-in.
6. Member data is sacred: collect little, ask consent, allow export and delete, follow local law (for example India's DPDP Act or the EU's GDPR).
7. Honest pricing, no lock-in: flat tiers, no hidden fees, data export at any time.

## Users

- **Owner or manager:** runs a small club and may use the limited Business Free tier or purchase a paid subscription.
- **Staff or trainer:** checks members in, records payments, approves scores.
- **Member / individual:** may use standalone Personal without a club; essential personal tracking is free, with optional Pro and Premium-AI subscriptions. Club members may additionally see club plans, IDs and leaderboards, and optionally share specific health metrics.

## Feature rules

### Onboarding

- Join with a mobile number only. An owner adds or invites a member by phone; the member verifies with an OTP and is attached to the club.
- Phone numbers are stored in E.164 format.

### Membership and payments

- Clubs define membership plans (and later class packs). Each member has a plan with start, expiry and renewal status.
- Club fees are paid by members in cash, UPI or card outside ClubKeep. **ClubKeep only records them** (member, plan, amount, method, date, who recorded it) and shows dues and receipts. It never processes, collects or holds club payments.
- ClubKeep's own revenue is the owner's subscription, billed through Razorpay (India) or Stripe (everywhere else).

### Check-in

Three methods, all writing the same attendance record: QR scan (signed, rotating token), GPS (member must be within the gym's radius), and manual entry by staff.

### ID card

- Digital and printable. Printed size is exactly credit-card size.
- Shows club branding, member details, subscription type, club address and expiry date.
- The QR code links to the member's online profile.
- Five layout designs will be provided; each club admin picks one. Month 1 ships one default layout. The five layouts are designed later.

### Leaderboards

- Only individuals attached to a club can appear. The club is the verification authority and the anti-cheat control: a score counts only after the club approves it.
- Four fixed calendar seasons a year, each 3 months long. The exact start months are an open decision (real seasons differ by hemisphere and country).
- Each sport or activity is ranked on its own KPIs, drawn from an activity KPI database:
  - Gym: for example deadlift weight, fat-to-muscle ratio, and more (full list to be defined).
  - Sports: match or event scores.
  - Yoga and dance: to be defined.
- Month 1 ships the club leaderboard with a shareable visual. City leaderboards across clubs come later.

### WhatsApp AI (after month 1)

- Growth and Pro plans only. Growth: 50 messages a day. Pro: 200 messages a day.
- The owner links their own WhatsApp number; an AI layer sends customized messages (renewals, class reminders, nudges).
- Opt-in by the owner after a clear warning about the risk of number bans, messages only to members who joined, member opt-out, and an approve-before-send mode.
- The connection uses the unofficial Baileys library, so it sits behind a channel interface that can be swapped for the official WhatsApp Business API.

## Business pricing (locked: original paid tiers + new Free tier)

| Tier    | India per month | Global per month | Includes                                                                                                                  |
| ------- | --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Free    | ₹0              | $0               | 25 club members, 1 staff account; essential workflows with monthly quotas OPEN; no sponsored Personal Pro |
| Starter | ₹299            | $5               | 1 location, up to 75 active members, 2 staff, QR and manual check-in, ID cards, club leaderboard, payment records        |
| Growth  | ₹749            | $15              | Up to 300 active members, 10 staff, GPS check-in, city leaderboards, insights, WhatsApp AI (50 messages a day)            |
| Pro     | ₹1,799          | $25              | Unlimited members, multi-location, data export API, priority support, WhatsApp AI (200 messages a day)                    |

Plan limits are stored per club and enforced on the server. Original paid feature guarantees remain unchanged; Growth and Pro have an **undetermined** number of sponsored Personal Pro seats. Personal: Free (5 AI requests/mo), Pro (₹199/$4; 50), Premium-AI (₹499/$10; 250); annual Personal approximately 20% off, rounding OPEN. See ENTITLEMENTS.md.

## Month-1 scope — Business track only

Easy phone onboarding, members and plans, QR/GPS/manual check-in, payment records, digital and printable ID card, club leaderboard, member profile with bio stats, basic owner insights, and owner subscription billing. Everything else waits. Standalone Personal, native wearables, medical records and India ABHA belong to a separate gated development track in DELIVERY_PLAN.md, not this one-month club MVP.

## Open decisions

- Full gym KPI list, and yoga and dance KPIs.
- Who enters a score (assumed: member or trainer enters, the club approves).
- Exact season months.
- The five ID card layouts.
- SMS provider for OTP delivery.
- Whether Stripe supports all launch countries.
