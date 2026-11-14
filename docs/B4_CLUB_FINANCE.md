# B4 — Externally recorded club payments, dues and receipts

Product contract approved for implementation 12 November 2026. B4 is **club operations bookkeeping**, not payment processing, a gateway, statutory invoicing, or ClubKeep SaaS billing.

## Vocabulary and data ownership
- A **charge** is the existing immutable MemberSubscription term price snapshot, denominated in integer minor units with ISO currency. Its amount is an internal expected club fee, **not recognized revenue**. No second invoice/charge record is silently created on renewal.
- A **recorded collection** is staff's attestation that the club received money externally by CASH, UPI, CARD or OTHER. Never infer payment from assignment, check-in, QR, or membership expiry.
- **Outstanding dues** = max(0, term snapshot price - sum(nonreversed payment records allocated to that term)). No cross-term auto-credit, cross-currency netting or unallocated suspense in B4.
- Canceled membership terms are **excluded from actionable dues**, but original charges, payments and cancellations remain visible; cancellation never implies a refund or automatically deletes a payment.
- A **reversal** corrects a mistaken payment entry, NOT a payment gateway refund. One append-only reversal row per payment, with an owner/manager, reason, audit and timestamp. The original receipt is retained and explicitly marked VOID.
- Owner receipt numbers monotonically increment per club, never reuse after a reversal. Printable receipt is proof of an externally **staff-recorded payment**, not a compliant GST/tax invoice and not gateway confirmation.
- Receipt snapshots preserve club name, member name/number, membership term, currency and amount as at recording, despite later edits/renames.
- If any club has membership terms in more than one currency, dashboards and totals remain separated by currency. Don't present mixed money as one total.
- Funds never move through ClubKeep. No card PAN/CVV, bank credentials, UPI PIN, processing, disbursement, gateway webhooks, refunds, taxes, statutory invoices or ClubKeep subscription checkout.

## Behavior
- OWNER/MANAGER/STAFF may record a collection for an ACTIVE member and noncancelled term, up to its remaining balance. OWNER/MANAGER may reverse one mistaken entry; STAFF cannot reverse.
- New collection's receivedAt defaults to trusted server time. No backdating in B4. Include optional external reference and note; neither is a verification claim.
- Every mutation requires verified session, exact-origin CSRF, isolated Redis rate limiting, bounded request, Zod parsing, club role, tenant status/readiness and immutable append-only transaction.
- Idempotency keys are UUIDs; concurrent retries serialize and replay the same result only for exactly matching payload. Collision with a different payload returns 409. Zero fee terms cannot have positive payments.
- Payment flow uses a club-scoped row lock to serialize receipt numbering and term balance, plus composite foreign keys for tenant isolation. Database CHECKs enforce positive amounts, and append-only triggers protect historical rows.
- Receipt/ledger screens and member financial history are authenticated and \`no-store\`. Owner/manager dashboard and full ledger, staff member-attached recording and receipt view; no open public financial data. The user-facing Personal domain never appears in Business finance queries.
- Record list and dues list must page; never fetch all payments or terms in the browser.
- Free/Starter/Growth/Pro pre-approved caps remain unchanged. No Free monthly transaction quota value is invented. No automatic conversion of currency/amount.
- Use Luxe visual tokens and mobile 360/390px, tablet, desktop; provide accessible forms, pending/loading/errors, and honest empty states.

## Routes
- \`/clubs/[clubId]/finance\` (owner/manager collections, outstanding dues and financial trends)
- \`/clubs/[clubId]/finance/payments\` (owner/manager immutable ledger and audit reversals)
- \`/clubs/[clubId]/finance/dues\` (owner/manager pagination)
- \`/clubs/[clubId]/finance/receipts/[paymentId]\` (owner/manager/staff private printable receipt)
- \`POST /api/clubs/[clubId]/finance/payments\` and \`POST /api/clubs/[clubId]/finance/payments/[paymentId]/reverse\` (strict protected mutations)
- Existing member details include payment form, term balance, payment history and receipt link.

## Release gates
Fresh/populated/legacy/noop Prisma PG17 migration and schema drift; unique receipt/idempotency, composite FKs, server-side authorization, reversal append-only, concurrent double-submit, multi-currency amounts, cancellation and no Personal access. Existing B1/B2/B3 and native x64/ARM64 standalone CI, targeted visual accessibility and privacy checks, off-host restore and MenuMinute isolation. Merge/deploy separately from writing code.
