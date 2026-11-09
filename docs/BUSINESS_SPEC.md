# ClubKeep business specification — Personal + Business

**Status:** Round 1 (1–15) and Round 2 (16–40) choices locked 9 Nov 2026, **with subsequent explicit owner amendments taking precedence**. OPEN details remain unapproved. This describes product intent, not shipped functionality or medical clearance.

**Related:** [PRODUCT.md](PRODUCT.md) (existing club features, roadmap and current paid club tiers), [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md). Later decisions must explicitly supersede this document rather than silently reverting the choices.

## Mail delivery choice — Mail-in-a-Box SMTP (9 November 2026)

**Owner-selected provider:** use the existing self-hosted **Mail-in-a-Box SMTP service at `mx.bababuilds.com`** for transactional email and magic links. Do **not** add a third-party free-tier email service, an SMS provider or an unauthenticated relay. Use authenticated submission on port **587 with mandatory STARTTLS**, a dedicated sender mailbox owned by the operator, strict TLS certificate validation, credential rotation, and app-specific per-user/per-IP mail send rate limits. The sender mailbox address and secret are not provided yet and **must remain OPEN**, not guessed. No live credentials in repository, command history or audit logs. SMTP belongs in protected ClubKeep server environment when enabled; Phase 0A config/docs only, Phase 0C actual magic-link send/recovery.

## New owner direction — SMS-free identity and deployment (9 November 2026)

**LOCKED:**
- No SMS provider, SMS OTP, or phone-number-based sign-in/registration. Google OAuth, WebAuthn/passkeys, optional email magic links and a single global user identity are the planned identity foundation. Existing email/password users should remain operable during transition.
- Owners authorize members with **single-use club invitation links or QR codes**, **7-day** expiry, revoke/reissue, and audited claiming. A club invite proves **permission to join the club only**; a forwarded link can be claimed by someone else and therefore is **not evidence of phone or real-world identity**.
- Phone fields are **optional unverified contact information**, not globally unique and not authentication or account-linking factors. Only a phone separately verified through an appropriate proof may be globally unique. Owner-entered numbers must never squat an account.
- Google standard OAuth establishes the Google account identity and optionally verified email, **not a guaranteed verified mobile number**. Optional Google People API phone import (with additional consent) is merely an **unverified contact**, may be absent, and is NOT a mandatory sign-up step.
- After identity onboarding, members should enroll **passkeys** for return sign-in, with Google or a separately verified email magic-link as recovery. Staff may revoke/reissue **club membership**, never seize or reset an individual's independent Personal account. A person with no remaining authenticator requires a separately designed high-assurance recovery process.
- **WhatsApp inbound phone-verification** is a possible **later** method only. Opening a prefilled message is not proof; an authenticated received message with short-lived challenge/sender validation is necessary, and official API/number requirements and pricing must be reviewed.
- Deploy **bare metal on the existing MenuMinute server**, not Docker/Compose. Host hardware can be shared but ClubKeep's application/systemd service, secrets, database identity, production releases, logs, backup restoration and auth security state must be isolated. Existing MenuMinute operations must not be disrupted. See [PHASE_0_FOUNDATION.md](PHASE_0_FOUNDATION.md) and [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md).

**These later instructions supersede any earlier requirement** for phone-only onboarding, SMS providers/OTP, Docker, dedicated host or staff-mediated global account recovery. Provider brand/free tier, exact production hostname and verified-phone implementation remain open and are not invented.

## Latest owner amendments — 9 November 2026 (supersede affected Round 2 selections)

1. **No clinician accounts, tenants, portals or clinician subscriptions.** Individuals manage their own care plans/appointment notes. The earlier interest in secure clinician-patient messages (#24) does **not** authorize clinician accounts. Two-way clinician messaging is **not an approved implementation**, and remains deferred unless an external-recipient identity mechanism is explicitly chosen.
2. **Personal Free medical-information vault is restricted to insurance information, blood type and user-entered “biological instructions.”** The last term is not yet clinically defined: treat it as private user-authored text, never a verified treatment directive or clinical diagnosis. Free still provides essential general fitness/wellness tracking and permitted basic activity imports.
3. **No medical history on Personal Free.** Historical diagnoses, conditions, medications, blood-pressure/glucose **clinical history** and lab results, clinical PDFs/OCR/FHIR records and ABDM clinical record access require **Personal Pro or Premium/AI**, in eligible countries and after regulatory/privacy gates. This supersedes earlier Free medical-document/history promises in #16/#19/#21/#31. Policy documents proving insurance coverage may be stored as insurance information; clinical records are not insurance documents.
4. All available **general fitness activity history** may still be imported by Free where sources and permissions allow. A user downgrading from paid must not lose encrypted medical records; normal paid medical-history tools become inactive but appropriate free export/deletion and data-subject rights remain. The precise downgrade read-only viewing policy is OPEN.
5. **Phase 0** covers only real authentication, migrations, CI, security and global identity. No live medical, wearable, insurer, clinician or billing product code is authorized by this planning stage. Read [PHASE_0_FOUNDATION.md](PHASE_0_FOUNDATION.md).

**Precedence:** These specific amendments override any contradicting wording elsewhere in this document or earlier documents; remaining approved pricing, club plan and privacy rules are unchanged.

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
11. **Individual tiers:** Exactly **Free / Pro / Premium-AI** for initial planning. Round 2 fixes the individual entitlements and Premium price as detailed below; unspecified fine-grained caps remain open.
12. **Personal Pro target list price:** **INR 199/month (India)** and **USD 4/month (international)**. Tax, store fees, exchange/region treatment and final checkout behavior remain open.
13. **Club sponsorship:** Paid clubs may sponsor premium *Personal* benefits for their members. Round 2 fixes Growth and Pro as the tiers with bundled sponsored Pro seats, but seat quantities and lifecycle rules remain open. Club relationship never defeats an individual's consent preferences.
14. **Additional revenue:** Coaching/trainer services and a fitness-program/services marketplace are in the vision. Round 2 fixes a 15% commission per completed marketplace booking; payouts, provider verification and refund rules remain open.
15. **Billing period:** Monthly and annual subscriptions, with annual approximately **20% below 12 monthly payments**. Final annual amounts/rounding remain open; the approximate 20% discount applies to Personal subscriptions; club annual discounts are not yet approved.

### Additional owner directions (locked at principle level)

- **Advertising:** Use existing Google AdSense on eligible free **web/PWA** surfaces, in a non-intrusive way. Never use health/medical/wearable data to select ads or send it to ad systems. Avoid ads in medical and sensitive health views; confirm applicable platform and publisher policies and consent before deployment. Native ad implementation is a separate unresolved choice, not implied by an AdSense account.
- **Free club plan:** ClubKeep Business will have a Free entry tier with usage limits and no sponsored Personal Pro entitlement. Prefer capped usage/volume over removing entire essential workflows. Round 2 fixes the Free tier at 25 members and 1 staff account; monthly quotas, location limits, and the owner-vs-staff counting rule remain open.
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

## 5. Round 2: owner-approved decisions (all 25 answered)

**Interpretation rule:** Letters are the owner's selections; where a choice says "A +" or "B +", it includes the features inherited from that option as presented in the questionnaire. No unselected recommendation is approval. Safety conditions apply even to approved features.

### Health data, devices and synchronization

16. **C — First usable Personal release:** activity, workouts, steps, weight, measurements; sleep, heart rate, calories, nutrition, recovery; **blood pressure, glucose, medications and medical records for paid Personal tiers**. Free's medical vault is restricted by the later amendment above. This is release scope, subject to available APIs, privacy, and country/age constraints; lab/clinical functions do not inherit an unconditional clearance.
17. **D — Direct wearables:** progressively integrate every commercially available provider when API access, permissions, licensing, economics and user demand permit. Begin the integration framework alongside native Apple Health/HealthKit and Android Health Connect. No promise that every vendor supports access or is integrated at first release.
18. **B — Read/write:** read authorized metrics; write back **only workouts and activity created by the user in ClubKeep**, with explicit source-specific write permission. Never overwrite imported sensor or clinical values; attach provenance and prevent sync loops.
19. **C — History:** import all *eligible* history allowed by provider APIs and user-granted permissions, **subject to the amended entitlement:** Free may import general fitness/activity records, but paid medical-history import is Pro/Premium only. No arbitrary loss of user-owned historical data on downgrade. Health Connect's older history may require a separate permission.
20. **B — Sync:** encrypted cloud synchronization, offline mobile caching and queued changes; implement conflict resolution, provenance, device revocation and a local-encryption design.

### Medical records and clinician workflows

21. **B — Medical record input (Pro/Premium only):** manual entry + PDFs/images, OCR, structured extraction with mandatory **user verification** before data becomes authoritative, and FHIR support. Record source, extraction confidence and corrections; user-uploaded documents are not automatically verified clinical diagnoses.
22. **A — Clinicians (reconfirmed):** users create their own plans; **no dedicated clinician accounts, clinic tenants or professional portals**, now explicitly final.
23. **A — Clinical AI launch:** start with wellness insights; release genuine clinical-decision-support functionality only in a **separate validated phase**, with intended-use analysis, appropriate clinical oversight and applicable regulatory review.
24. **B — Earlier desired workflows, subject to later clarification:** individual-owned care plans, goals, appointments, notes, optional secure record exports. Earlier requested shared records and secure clinician-patient messages are **deferred and NOT approved for delivery** because the final no-clinician-accounts decision prohibits introducing a clinician portal. Any future verified external-recipient messaging would require a separate design decision.
25. **B — Abnormal readings:** clearly labeled unusual-reading prompts with recommendations to contact an appropriate clinician; no monitoring guarantee, emergency service, diagnosis or automated treatment promise. Accuracy, source warnings and escalation wording require review.

### AI and community

26. **B — Providers:** Groq + NVIDIA NIM with task-aware routing based on quality, latency, reliability, cost and privacy eligibility. Provider outages must fail safely; no accidental routing to an unapproved vendor.
27. **A — External medical AI consent:** obtain **explicit consent once per provider** before identifiable medical data can be sent to that provider. The consent must disclose meaningful purposes/data types, be logged and revocable; material purpose or provider changes require renewal where required by law. No consent means no sensitive payload sent; the system cannot assume blanket permission from joining a club.
28. **A — AI allocations:** **Free 5 / Pro 50 / Premium-AI 250 requests per month.** What counts as a request, retries, rollover, overages and annual-plan treatment remain implementation/business details to resolve before billing.
29. **C — AI coaching:** explanation and fitness/recovery/nutrition goal guidance + personalized/adaptive programs + **interactive conversational fitness coaching**. This is not approval for autonomous clinical intervention.
30. **C — Social:** friends, opt-in communities, challenges, badges and **opt-in public fitness achievements**. No health metrics, medical records or teen profiles become public by default.

### Personal subscription and advertising

31. **A — Personal Free, amended:** unlimited essential **fitness/wellness** manual tracking, permitted **nonclinical activity** imports and basic graphs; private limited medical-information vault for **insurance information, blood type and user-written biological instructions only**. No medical histories or clinical document storage on Free; Pro/Premium unlock those once available. Unlimited is user-facing functional entitlement, not unlimited unmetered server abuse, backups or instant provider availability.
32. **C — Personal Pro (INR 199 / USD 4 monthly):** ad-free, advanced charts, custom dashboards and goals; deeper insights, 50 monthly AI requests, exports, advanced progress analysis; **premium wearable integrations and longer analytical history**. Resolve scope against amended #31: Free keeps already imported **general fitness** history and the limited nonclinical medical-information vault. Pro adds eligible medical history and extended fitness analytics; downgrade preserves encrypted paid medical archives and lawful export/deletion but disables the normal medical-history UI. Advanced licensed provider capabilities may be Pro-gated; baseline permitted imports remain Free.
33. **B — Premium-AI price:** **INR 499 / USD 10 per month**, with everything in Pro and 250 monthly AI requests. Additional exclusive Premium features are **OPEN**; do not invent medical privileges.
34. **A — Ads:** existing AdSense for eligible Free **web/PWA education, articles, fitness guides and non-sensitive discovery pages only**. Never place third-party advertising in medical records, private dashboard, biometric screens, AI/medical chat, insurance, ABHA, clinician areas, or among teenage users. No health-derived targeting, ad analytics or data transfers.
35. **B — Distribution/billing:** web checkout plus Apple/Google in-app subscription mechanisms wherever applicable and compliant. Server-verifiable entitlements, receipt/webhook processing and restoration must reconcile purchases across clients. Country/store taxes, pricing rules and fees need further analysis.
36. **C — Ages:** adults and teenagers from launch with age-based restrictions and country-specific guardian/age-verification flows; for India treat under-18 as children when DPDP provisions apply. No default teen public profile, social discovery, ads, clinician data sharing or clinical AI without appropriate gating and review.

### Business Free, club sponsorship and marketplace

37. **A — Free Club limits:** **25 members and 1 staff account**. Whether the owner counts toward the staff allowance, number of locations, invited/pending member counting, and overflow behavior are OPEN.
38. **A — Free Club access:** essential workflows generally accessible, but subject to member caps and **monthly quotas**. **No sponsored Personal Pro** entitlement. Exact quotas and which advanced club features are restricted remain OPEN; do not contradict published paid-tier feature guarantees.
39. **A — Sponsored Personal:** **Growth and Pro** receive fixed numbers of **Personal Pro** sponsored seats. Seat quantities are OPEN, as are reclaim/reassignment rules and stacking when a member already pays for Pro. This selection supersedes any Round 1 implication of sponsorship on Starter or every paid club. Sponsored seats do **not** imply Premium/AI or access to medical data.
40. **B — Marketplace:** **15% commission per completed coaching/fitness booking**. Define the commission calculation base, provider eligibility, payment provider, taxes, refunds, payouts, disputes and minors' participation before releasing transactions.

### Additional owner-approved scope

- **Insurance details:** allow individuals to store insurance-provider name, policy/member identifiers, policy documents and relevant coverage/renewal information (exact schema and verification pending). Treat these as sensitive individual-controlled records; do not expose them to clubs or advertisers.
- **India ABHA/ABDM:** integrate with ABHA for identity linking and **consent-mediated health-record exchange** via supported ABDM pathways, subject to onboarding/sandbox/go-live requirements. ABHA linking must be opt-in and country-gated. Never treat an ABHA number as a credential or consent to fetch records. Start with optional user verification/linking and documents; support official health information exchange only after required ABDM approval. **ABHA is not automatically a live insurance-policy feed or NHCX claims integration.** Insurance verification/claims require separately approved interfaces.

## 6. Final entitlement rules and cross-product behavior

See [ENTITLEMENTS.md](ENTITLEMENTS.md) for the owner-approved + unresolved matrix. Key immutable business boundaries:

- A person's **Personal** account, uploaded records, permitted historical imports and medical data remain accessible independently of club membership or paid sponsorship. Paid analytical features may cease at downgrade, not the records themselves.
- Club data and Personal health data use separate authorization domains and independently scoped ownership. Clubs see only specific Personal metrics the individual intentionally shares; allow prompt revocation and auditable sharing receipts, including for sponsored users.
- Free Business is not a trial: 25 members, one staff seat, basic club functionality with quota-based usage, and **zero** sponsored Pro benefits.
- Starter/Growth/Pro keep existing prices and stated club benefits unless explicitly overridden. Growth/Pro may sponsor fixed but as-yet-undetermined numbers of Personal **Pro** members. Do not implement invented seat quantities.
- Personal Free includes 5 AI requests/month and eligible non-sensitive contextual web ads. Pro at INR 199/USD 4 has 50 AI requests/month, no ads, deeper analysis and premium device capabilities. Premium-AI at INR 499/USD 10 has 250 AI requests/month and Pro entitlements. Clinical privileges are **not** a perk of paid tiers.
- Marketplace is an independent 15%-commission transaction flow and does **not** change the rule that ClubKeep Business merely records a gym's own membership fee payments.
- Approx. 20% annual discount is approved for **Personal**; exact amounts and rounding remain open. Illustrative pre-tax arithmetic, NOT final prices: Pro INR 1,910.40 / USD 38.40 annually; Premium INR 4,790.40 / USD 96 annually.

## 7. Conflicts, exceptions and open design questions

**Blocking contradictions, selections preserved:**

1. **#22 vs #24 resolved by latest owner direction:** **no dedicated clinician accounts**, period. User-authored care plans and appointment notes may ship later; **clinician messaging is deferred** pending any separately approved external-recipient security model. This is no longer an open question about whether clinician accounts can be added.
2. **#31 vs #32, amended:** unlimited Free **fitness** history versus Pro extended analytical and **medical** history. Free retains imported fitness records. On Pro medical-history downgrade, preserve encrypted records and free legal export/deletion; suspend paid medical-history tools. Do not promise the normal medical-history UI on Free.
3. **#17/#19/#31 vs #32:** progressive all-vendor coverage and free imports versus premium integrations. Reconciled as free *baseline* data access where a vendor makes it available, and Pro enhanced/contractual premium connector capabilities. Provider-specific contractual fees and unsupported APIs may constrain offerings; disclose them.
4. **#36 versus worldwide availability and advertising:** teenagers supported subject to local legal/age checks, guardian consent where applicable, no ads in authenticated teen areas, closed social discovery and safety review. Do not claim instant availability in every country.
5. **#27 consent vs clinical safety:** per-provider opt-in is not unlimited license to reuse health data for arbitrary tasks. Maintain purpose scope, ability to revoke, audit and vendor contract checks; unapproved AI routes must remain disabled.
6. **#24 vs #23:** user-owned health reminders and wellness education can launch earlier; clinician-grade advice and condition-specific clinical support stay in a validated future release.
7. **Insurance vs ABHA:** insurance policy storage is a Personal feature; automatic eligibility, claims and insurance-policy discovery do not come from ABHA linking alone. Treat NHCX/insurer connections separately.

**Still OPEN and must not be fabricated:** Growth/Pro sponsored-seat counts; exact Free Club monthly quotas, limits and owner counting; any optional secure **external clinician-recipient** messaging mechanism (clinician accounts are expressly forbidden); exact Pro premium connectors; whether premium includes non-AI perks; AI counting/retry and overages; marketplace payouts and commission base; family/guardian verification by country; ABHA integration partner and go-live credentials; provider contracts; annual price rounding/tax, native rollout schedule; clinical regulatory clearance; insurance sync partners; child-specific controls.

## 8. Implementation and launch safeguards

Read [HEALTH_INTEGRATIONS.md](HEALTH_INTEGRATIONS.md) and [DELIVERY_PLAN.md](DELIVERY_PLAN.md) before building. Their sequencing is **recommended planning**, not extra owner-approved scope. Current ClubKeep repo remains an early scaffold and Luxe prototype; do not misrepresent any Round 2 features as shipped.

- Apple HealthKit and Android Health Connect require specific permissions and prohibit health data from being used for ad serving. AdSense must never ingest health signals; content placements must be reviewed for policy compliance even if contextual. Separate ad-enabled public discovery routes from authenticated health routes.
- Health Connect default lookback for most historical records is 30 days before first permission grant; older records may require separately granted `PERMISSION_READ_HEALTH_DATA_HISTORY`. User/provider availability ultimately determines importer coverage.
- Medical documents: encrypt at rest and in transit, private object storage, antivirus/file-type checking, export/delete, retention rules, access logs, provenance; OCR output remains **draft** pending explicit user review.
- Clinical alerts are educational triage prompts and must not claim a monitored emergency service or auto-diagnosis.
- Local age/consent restrictions apply before a teenage user may use community, AI, medical sharing or third-party providers.
- Provider eligibility must be verified for health-data processing; store consent version, provider, purposes, timestamp and revocation. On consent withdrawal, stop new transfers and respect provider/lawful retention rules.
- The existing one-month **Business** roadmap remains the first delivery track; Personal is added through separately gated phases, not an implicit promise to ship full clinical workflows in December 2026.

**Review official sources before release:**
- https://developer.apple.com/documentation/healthkit/protecting-user-privacy
- https://support.google.com/googleplay/android-developer/answer/18265346
- https://developer.android.com/health-and-fitness/health-connect/read-data
- https://abdm.gov.in/
- https://www.nrces.in/ndhm/fhir/r4/
- https://www.pib.gov.in/PressReleasePage.aspx?PRID=1948522
- https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025
- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software

## 9. Documentation priority and change control

If [PRODUCT.md](PRODUCT.md) predates a locked Round 2 fact above, this document takes precedence for **Personal** scope, Free Business additions, sponsorship rules and teen policy; existing club operations and prices otherwise remain governed by PRODUCT.md. Missing details are **OPEN** even when necessary to implement a feature; agents must not turn suggested defaults into owner decisions. Do not add regulated medical features, ad placements or insurance transactions without applicable reviews.
