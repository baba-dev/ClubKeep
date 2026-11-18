import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubActive } from "@/lib/member-service";
import {
  chargeAmount,
  currencyForCountry,
  effectiveTier,
  isBillableTier,
  LIST_PRICE_MINOR,
  normalizeCountry,
  providerForCountry,
  transitionFor,
  type BillableTier,
  type ProviderId,
} from "@/lib/billing/policy";
import { BillingError, type BillingEvent, type BillingProvider } from "@/lib/billing/provider";

type Tx = Pick<
  PrismaClient,
  "club" | "clubSubscription" | "securityEvent" | "billingWebhookEvent" | "$queryRaw"
>;

const SUBSCRIPTION_FACTS = {
  id: true,
  tier: true,
  status: true,
  currentPeriodEnd: true,
  pastDueSince: true,
} as const;

/**
 * Lock order is ALWAYS Club row first, then ClubSubscription row. Checkout,
 * cancel and webhooks all follow it, so they can serialize but never deadlock.
 */
async function lockClub(tx: Pick<PrismaClient, "$queryRaw">, clubId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Club" WHERE "id" = ${clubId} FOR UPDATE`;
}

/**
 * Write the entitled tier onto Club.businessTier when it differs, with an audit
 * row. Enforcement does not depend on this (it reads effectiveTier directly);
 * this keeps the stored value honest for display and for checkout fallbacks.
 * Caller must hold the Club row lock.
 */
export async function reconcileClubTier(tx: Tx, clubId: string, now: Date) {
  const club = await tx.club.findUnique({
    where: { id: clubId },
    select: { businessTier: true, billingSubscription: { select: SUBSCRIPTION_FACTS } },
  });
  if (!club) return null;
  const entitled = effectiveTier(club.billingSubscription, club.businessTier, now);
  if (entitled !== club.businessTier) {
    await tx.club.update({ where: { id: clubId }, data: { businessTier: entitled } });
    await tx.securityEvent.create({
      data: {
        clubId,
        eventType: "BILLING_TIER_CHANGED",
        referenceId: club.billingSubscription?.id ?? null,
      },
    });
  }
  return entitled;
}

export type StartCheckoutInput = { tier: string; countryCode?: string };

/** What a billing request needs from its environment; routes build it from configuration. */
export type BillingContext = {
  /** Builds the provider for an id, or throws BillingError(503) if it is not configured. */
  providerFor: (id: ProviderId) => BillingProvider;
  /** GST for Razorpay plan amounts (Stripe adds tax itself); null when the operator has not set it. */
  taxBasisPoints: number | null;
  /** The club's billing page URL, for providers that redirect back. */
  returnUrl: string;
};

/** Owner starts a subscription. Returns the provider's hosted checkout URL. */
export async function startCheckout(
  db: PrismaClient,
  ctx: BillingContext,
  actorId: string,
  clubId: string,
  input: StartCheckoutInput,
  now = new Date()
) {
  await requireClubActive(db, actorId, clubId, ["OWNER"]);
  if (!isBillableTier(input.tier)) throw new BillingError(400, "Choose a paid plan");
  const tier: BillableTier = input.tier;

  const setup = await db.clubSetupProgress.findUnique({
    where: { clubId },
    select: { countryCode: true },
  });
  const rawCountry = input.countryCode ?? setup?.countryCode;
  if (!rawCountry) throw new BillingError(400, "Choose your club's country to continue");
  const country = normalizeCountry(rawCountry);
  const providerId = providerForCountry(country);
  const provider = ctx.providerFor(providerId);

  const existing = await db.clubSubscription.findUnique({
    where: { clubId },
    select: { ...SUBSCRIPTION_FACTS, provider: true, providerSubscriptionId: true },
  });
  if (
    existing &&
    (existing.status === "ACTIVE" ||
      existing.status === "PAST_DUE" ||
      (existing.status === "CANCELLED" &&
        existing.currentPeriodEnd &&
        existing.currentPeriodEnd.getTime() > now.getTime()))
  ) {
    throw new BillingError(
      409,
      "This club already has a plan. Changing plans is not available yet; cancel it first."
    );
  }

  const currency = currencyForCountry(country);
  const listMinor = LIST_PRICE_MINOR[currency][tier];
  if (providerId === "RAZORPAY" && ctx.taxBasisPoints === null) {
    throw new BillingError(503, "Paid plans are not available yet");
  }
  const chargeMinor = chargeAmount(providerId, listMinor, ctx.taxBasisPoints ?? 0);

  // External call first, outside any database transaction. An orphaned,
  // never-authorised provider checkout expires on its own.
  const checkout = await provider.createCheckout({
    clubId,
    tier,
    currency,
    chargeAmountMinor: chargeMinor,
    now,
    returnUrl: ctx.returnUrl,
  });

  await db.$transaction(async (tx) => {
    await lockClub(tx, clubId);
    // Settle any old, finished subscription before replacing it.
    await reconcileClubTier(tx, clubId, now);
    const data = {
      tier,
      provider: provider.id,
      status: "PENDING" as const,
      // Stripe stores the Checkout Session id here until payment binds the subscription id.
      providerSubscriptionId: checkout.providerSubscriptionId,
      currency,
      amountMinor: listMinor,
      chargeAmountMinor: chargeMinor,
      countryCode: country,
      currentPeriodEnd: null,
      pastDueSince: null,
      cancelAtPeriodEnd: false,
      lastEventAt: null,
      createdByUserId: actorId,
    };
    const row = await tx.clubSubscription.upsert({
      where: { clubId },
      create: { clubId, ...data },
      update: data,
      select: { id: true },
    });
    await tx.securityEvent.create({
      data: {
        actorUserId: actorId,
        clubId,
        eventType: "BILLING_SUBSCRIPTION_STARTED",
        referenceId: row.id,
      },
    });
  });
  // A second checkout replaced a pending one: close the old session so it cannot
  // be paid later (best effort; it also expires on its own).
  if (existing?.status === "PENDING" && existing.provider === provider.id) {
    await provider.abandonCheckout?.(existing.providerSubscriptionId);
  }
  return { checkoutUrl: checkout.checkoutUrl };
}

const BOUND = /^sub_/;

/** Owner cancels. An ACTIVE plan runs to the end of the paid period; a PAST_DUE one ends now. */
export async function requestCancel(
  db: PrismaClient,
  providerFor: BillingContext["providerFor"],
  actorId: string,
  clubId: string
) {
  await requireClubActive(db, actorId, clubId, ["OWNER"]);
  const sub = await db.clubSubscription.findUnique({
    where: { clubId },
    select: { ...SUBSCRIPTION_FACTS, providerSubscriptionId: true, provider: true },
  });
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE")) {
    throw new BillingError(409, "There is no active plan to cancel.");
  }
  const provider = providerFor(sub.provider);
  await provider.cancelSubscription(sub.providerSubscriptionId, sub.status === "ACTIVE");
  await db.$transaction(async (tx) => {
    await lockClub(tx, clubId);
    await tx.clubSubscription.update({ where: { clubId }, data: { cancelAtPeriodEnd: true } });
    await tx.securityEvent.create({
      data: {
        actorUserId: actorId,
        clubId,
        eventType: "BILLING_CANCEL_REQUESTED",
        referenceId: sub.id,
      },
    });
  });
}

/** A hosted page where the owner updates the payment method (Stripe). Owner only. */
export async function createPortalLink(
  db: PrismaClient,
  providerFor: BillingContext["providerFor"],
  actorId: string,
  clubId: string,
  returnUrl: string
) {
  await requireClubActive(db, actorId, clubId, ["OWNER"]);
  const sub = await db.clubSubscription.findUnique({
    where: { clubId },
    select: { status: true, provider: true, providerSubscriptionId: true },
  });
  if (
    !sub ||
    (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") ||
    !BOUND.test(sub.providerSubscriptionId)
  ) {
    throw new BillingError(409, "There is no active plan to manage.");
  }
  const provider = providerFor(sub.provider);
  if (!provider.createPortalSession) {
    throw new BillingError(
      409,
      "Payment details for this plan are updated from your payment provider's email."
    );
  }
  return { url: await provider.createPortalSession(sub.providerSubscriptionId, returnUrl) };
}

export type WebhookOutcome =
  | "APPLIED"
  | "DUPLICATE"
  | "IGNORED"
  | "UNKNOWN_SUBSCRIPTION"
  | "CLUB_MISMATCH"
  | "STALE"
  | "NO_CHANGE";

/**
 * Apply one verified provider event exactly once.
 * - Idempotent: the (provider, eventId) row is claimed first; a replay is a no-op.
 * - The club is found only through OUR stored provider id: the subscription id, or
 *   (Stripe, first payment) the Checkout Session id we stored on the pending row.
 *   A club id in provider metadata is a hint that must match, never an instruction.
 * - Serialized per club (Club row lock) so racing events apply in a defined order,
 *   and older events (by provider event time) cannot undo newer ones.
 * - Stripe can deliver subscription events before the checkout event that binds the
 *   subscription. Those are not ours to drop: they answer 503 (rolling back the
 *   claim) so Stripe redelivers once the row is bound.
 * Any unexpected error rolls everything back, including the claim, so the
 * provider's retry processes the event again.
 */
export async function applyWebhookEvent(
  db: PrismaClient,
  event: BillingEvent,
  now = new Date()
): Promise<WebhookOutcome> {
  return db.$transaction(async (tx) => {
    const claim = await tx.billingWebhookEvent.createMany({
      data: [
        {
          provider: event.provider,
          providerEventId: event.providerEventId,
          eventType: event.eventType.slice(0, 80),
          outcome: "RECEIVED",
        },
      ],
      skipDuplicates: true,
    });
    if (claim.count === 0) return "DUPLICATE";

    const finish = async (outcome: Exclude<WebhookOutcome, "DUPLICATE">) => {
      await tx.billingWebhookEvent.update({
        where: {
          provider_providerEventId: {
            provider: event.provider,
            providerEventId: event.providerEventId,
          },
        },
        data: { outcome },
      });
      return outcome;
    };

    if (event.kind === "IGNORED" || !event.providerSubscriptionId) return finish("IGNORED");
    const byId = (providerSubscriptionId: string) => ({
      provider_providerSubscriptionId: { provider: event.provider, providerSubscriptionId },
    });
    // An event carrying a Checkout Session id is decided by the row holding that
    // session: it can only ever bind that club's pending subscription. Only if no
    // row holds the session (a redelivery after binding) do we fall back to the
    // subscription id.
    let located = event.checkoutSessionId
      ? await tx.clubSubscription.findUnique({
          where: byId(event.checkoutSessionId),
          select: { clubId: true },
        })
      : null;
    located ??= await tx.clubSubscription.findUnique({
      where: byId(event.providerSubscriptionId),
      select: { clubId: true },
    });
    if (!located) {
      if (event.checkoutSessionId) {
        // A paid checkout whose pending row is gone (replaced or never stored): no
        // retry can fix it, so surface it loudly for the operator instead.
        console.error("billing: paid checkout has no matching pending subscription");
      } else if (event.provider === "STRIPE" && event.notedClubId) {
        // Ours by metadata but not bound yet: ask the provider to redeliver.
        throw new BillingError(503, "Subscription not bound yet; retry later");
      }
      return finish("UNKNOWN_SUBSCRIPTION");
    }

    await lockClub(tx, located.clubId);
    // Re-read after the lock: this is the state every racing event serializes on.
    const sub = await tx.clubSubscription.findUnique({
      where: { clubId: located.clubId },
      select: {
        ...SUBSCRIPTION_FACTS,
        clubId: true,
        lastEventAt: true,
        cancelAtPeriodEnd: true,
        providerSubscriptionId: true,
      },
    });
    if (!sub) return finish("UNKNOWN_SUBSCRIPTION");
    const binds =
      !!event.checkoutSessionId &&
      sub.status === "PENDING" &&
      sub.providerSubscriptionId === event.checkoutSessionId;
    // The row must still be the one we located (it may have been replaced meanwhile).
    if (!binds && sub.providerSubscriptionId !== event.providerSubscriptionId) {
      return finish("UNKNOWN_SUBSCRIPTION");
    }
    if (event.notedClubId && event.notedClubId !== sub.clubId) return finish("CLUB_MISMATCH");
    if (binds) {
      const taken = await tx.clubSubscription.findUnique({
        where: byId(event.providerSubscriptionId),
        select: { clubId: true },
      });
      if (taken) return finish("CLUB_MISMATCH");
    }
    // SYNC only mirrors a flag: it neither obeys nor moves the ordering clock.
    if (
      event.kind !== "SYNC" &&
      sub.lastEventAt &&
      event.occurredAt.getTime() < sub.lastEventAt.getTime()
    ) {
      return finish("STALE");
    }
    const patch = transitionFor(
      sub,
      event.kind,
      event.occurredAt,
      event.periodEnd,
      event.cancelAtPeriodEnd ?? null
    );
    if (!patch) return finish("NO_CHANGE");
    if (event.kind === "SYNC" && patch.cancelAtPeriodEnd === sub.cancelAtPeriodEnd) {
      return finish("NO_CHANGE");
    }

    await tx.clubSubscription.update({
      where: { clubId: sub.clubId },
      data: {
        status: patch.status,
        pastDueSince: patch.pastDueSince,
        ...(patch.currentPeriodEnd ? { currentPeriodEnd: patch.currentPeriodEnd } : {}),
        ...(binds ? { providerSubscriptionId: event.providerSubscriptionId } : {}),
        ...(event.kind === "SYNC" ? {} : { lastEventAt: event.occurredAt }),
        cancelAtPeriodEnd:
          patch.cancelAtPeriodEnd ?? (patch.status === "CANCELLED" ? false : sub.cancelAtPeriodEnd),
      },
    });
    await reconcileClubTier(tx, sub.clubId, now);
    return finish("APPLIED");
  });
}
