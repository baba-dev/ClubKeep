# ClubKeep business specification — Personal + Business

**Status:** Round 1 owner-approved decisions are **LOCKED** on 9 Nov 2026. Round 2 details are explicitly **OPEN**, not implied approvals. This document describes product intent, not shipped functionality.

**Related:** [PRODUCT.md](PRODUCT.md) (existing club features, roadmap and current paid club tiers), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md). Later decisions must explicitly supersede this document rather than silently reverting the choices.

## 1. Locked product architecture and audience

1. **Product identity:** ClubKeep Personal is a full standalone product, sharing one identity/account with ClubKeep Business. Personal data persists independently of any club membership.
2. **Audience:** All health-conscious individuals, including non-gym users. The club product remains focused on gyms first, then other activities.
3. **Clients:** Responsive web/PWA plus native-capable Android and iOS apps (delivery mechanism and rollout order still open).
4. **Market:** Global launch intent with country-specific feature availability; not a commitment to offer regulated medical or payment functions everywhere on day one.

## 2. Locked health, medical, AI and social scope

5. **Data and clinical scope:** Fitness/biometrics, sleep, activity, nutrition, wellness, medical records, medications, test results, clinician workflows, care plans and medical services are within the *product vision*. Actual clinical features are gated on necessary validation, local legal review and safe implementation.
6. **Integrations:** Both Apple Health/HealthKit and Android Health Connect **and** direct wearable/vendor connections are prioritized. Specific vendors, licensing, history windows and launch order remain open.
7. **Intelligence:** AI explanations, fitness coaching, training programs, lifestyle suggestions and *clinical decision-support* capabilities are in scope. AI cannot be presented as an autonomous diagnostician or a substitute for qualified clinicians; validate intended uses and country-specific regulatory status before clinical release.
8. **Club sharing:** A club receives **only specific personal health metrics explicitly authorized by an individual**. Consent must be granular, revocable and auditable. Joining or paying a club never grants automatic access to Personal health/medical records. Access ends when revoked, subject to any independently lawful record retention.
9. **Experience:** Private personal history, goals, streaks, social/community and competitions, with social features and sensitive sharing **opt-in**.

**AI provider choice (owner addendum):** Groq and NVIDIA NIM; route each use case to the strongest permissible model on quality, reliability, latency and cost, and maintain appropriate data-processing terms. Sending sensitive health information to an external provider requires suitable legal basis/consent and vendor controls; model switching must not bypass those controls.

## 3. Locked commercial structure

10. **B2C revenue:** Free essential health tracking plus optional Personal Pro, with a higher Premium/AI tier.
11. **Individual tiers:** Exactly **Free / Pro / Premium-AI** for initial planning. Detailed entitlements and Premium price remain open.
12. **Personal Pro target list price:** **INR 199/month (India)** and **USD 4/month (international)**. Tax, store fees, exchange/region treatment and final checkout behavior remain open.
13. **Club sponsorship:** Paid clubs may sponsor premium *Personal* benefits for their members. Exact tier, quantities and duration remain open. Club relationship never defeats an individual's consent preferences.
14. **Additional revenue:** Coaching/trainer services and a fitness-program/services marketplace are in the vision. Commission, payouts, provider verification and refund rules remain open.
15. **Billing period:** Monthly and annual subscriptions, with annual approximately **20% below 12 monthly payments**. Final annual amounts/rounding remain open.

### Additional owner directions (locked at principle level)

- **Advertising:** Use existing Google AdSense on eligible free **web/PWA** surfaces, in a non-intrusive way. Never use health/medical/wearable data to select ads or send it to ad systems. Avoid ads in medical and sensitive health views; confirm applicable platform and publisher policies and consent before deployment. Native ad implementation is a separate unresolved choice, not implied by an AdSense account.
- **Free club plan:** ClubKeep Business will have a Free entry tier with usage limits and no sponsored Personal Pro entitlement. Prefer capped usage/volume over removing entire essential workflows. **Do not invent** member/staff/location caps, feature limits or included AI allowances before Round 2.
- **Existing paid club tiers:** Starter INR 299/USD 5, Growth INR 749/USD 15, Pro INR 1,799/USD 25 per month remain as currently documented in PRODUCT.md until specifically changed. The Free club tier is an addition, not a revision to those prices.
- **Billing distinction:** ClubKeep Business continues to **record** membership fee payments; it does not collect them. Platform subscription billing and future marketplace payment operations are separate products and require independent design.
- **Data portability:** A member's Personal data and paid subscription survive disconnecting from or changing clubs. Club attendance/payment/business records stay appropriately club-owned under their own lawful retention/export rules.

## 4. Safety, privacy and regulatory implementation gates

- Consent by individual metric category, recipient, purpose, duration and revocation. No hidden linkage of clinical records to club dashboards, staff accounts or leaderboards.
- Separate operational records, medical/health records, and advertising analytics; least privilege, encryption, access audit trails and export/deletion flows before handling production medical records.
- Clinical decision-support features require an explicit intended-use classification per country, clinical oversight/validation when relevant, model evaluation and escalation safeguards. AI-generated clinical claims must not be deployed solely because an LLM API supports them.
- For Apple HealthKit and Android Health Connect, collected health data must not be used for advertising. Google publisher policies restrict targeting based on sensitive health information. Use no health-derived ad signals. Contextual/non-personalized display on eligible non-sensitive pages is only a design direction pending compliance review.
- Regional and user-level feature gates, and permissions that vary by data type, are mandatory before worldwide availability is claimed.

**Official policy references (current research pointers; recheck before shipping):**
- Apple HealthKit privacy: https://developer.apple.com/documentation/healthkit/protecting-user-privacy
- Google Play Health Connect limited use: https://support.google.com/googleplay/android-developer/answer/18265346
- Google publisher personalized advertising: https://support.google.com/adsense/answer/10502938
- FDA clinical decision-support guidance (Jan 2026): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software

## 5. Round 2 — open decisions (no default is binding)

- Personal Free/Pro/Premium feature entitlements and Premium/AI price; sponsorship rules and stacking.
- Data types and storage: record imports, integrations, historical depth, retention, cross-device sync and offline operation.
- Direct wearable vendor priorities, write-back and provider costs.
- Clinician role and onboarding, clinical-decision-support launch strategy, clinician payments, emergency/critical-result workflows and medical record sharing.
- AI limits and metering (Groq vs NVIDIA NIM); model routing, privacy and cost caps.
- Advertising placements, exclusions, native ad approach and privacy choices.
- Club Free caps and usage-limited access; how paid club entitlements interact with Personal.
- Marketplace commissions, refunds, payouts and verification.
- Global billing, taxes, family/youth policy and phased regional availability.

## 6. Implementation note

This document authorizes **planning**, not an immediate database migration, clinical feature launch or expansion of the current month-one build. Keep the club-side implementation roadmap in PRODUCT.md/ROADMAP.md unless separately revised by an explicit scope decision.
