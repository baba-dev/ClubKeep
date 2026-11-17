import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubActive } from "@/lib/member-service";
import {
  currencyForCountry,
  effectiveTier,
  isBillableTier,
  LIST_PRICE_MINOR,
  normalizeCountry,
  priceWithTax,
  providerForCountry,
  transitionFor,
  type BillableTier,
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

/** Owner starts a subscription. Returns the provider's hosted checkout URL. */
export async function startCheckout(
  db: PrismaClient,
  provider: BillingProvider,
  taxBasisPoints: number,
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
  if (providerForCountry(country) !== provider.id) {
    throw new BillingError(409, "Plan billing is not available in your country yet.");
  }

  const existing = await db.clubSubscription.findUnique({
    where: { clubId },
    select: SUBSCRIPTION_FACTS,
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
  const chargeMinor = priceWithTax(listMinor, taxBasisPoints);

  // External call first, outside any database transaction. An orphaned,
  // never-authorised provider subscription expires on its own.
  const checkout = await provider.createCheckout({
    clubId,
    tier,
    currency,
    chargeAmountMinor: chargeMinor,
    now,
  });

  await db.$transaction(async (tx) => {
    await lockClub(tx, clubId);
    // Settle any old, finished subscription before replacing it.
    await reconcileClubTier(tx, clubId, now);
    const data = {
      tier,
      provider: provider.id,
      status: "PENDING" as const,
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
  return { checkoutUrl: checkout.checkoutUrl };
}

/** Owner cancels. An ACTIVE plan runs to the end of the paid period; a PAST_DUE one ends now. */
export async function requestCancel(
  db: PrismaClient,
  provider: BillingProvider,
  actorId: string,
  clubId: string
) {
  await requireClubActive(db, actorId, clubId, ["OWNER"]);
  const sub = await db.clubSubscription.findUnique({
    where: { clubId },
    select: { ...SUBSCRIPTION_FACTS, providerSubscriptionId: true, provider: true },
  });
  if (
    !sub ||
    sub.provider !== provider.id ||
    (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE")
  ) {
    throw new BillingError(409, "There is no active plan to cancel.");
  }
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
 * - The club is found only through OUR stored provider subscription id. A club id
 *   in provider metadata is a hint that must match, never an instruction.
 * - Serialized per club (Club row lock) so racing events apply in a defined order,
 *   and older events (by provider event time) cannot undo newer ones.
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
    const where = {
      provider_providerSubscriptionId: {
        provider: event.provider,
        providerSubscriptionId: event.providerSubscriptionId,
      },
    };
    const located = await tx.clubSubscription.findUnique({ where, select: { clubId: true } });
    if (!located) return finish("UNKNOWN_SUBSCRIPTION");

    await lockClub(tx, located.clubId);
    // Re-read after the lock: this is the state every racing event serializes on.
    const sub = await tx.clubSubscription.findUnique({
      where,
      select: { ...SUBSCRIPTION_FACTS, clubId: true, lastEventAt: true, cancelAtPeriodEnd: true },
    });
    if (!sub) return finish("UNKNOWN_SUBSCRIPTION");
    if (event.notedClubId && event.notedClubId !== sub.clubId) return finish("CLUB_MISMATCH");
    if (sub.lastEventAt && event.occurredAt.getTime() < sub.lastEventAt.getTime()) {
      return finish("STALE");
    }
    const patch = transitionFor(sub, event.kind, event.occurredAt, event.periodEnd);
    if (!patch) return finish("NO_CHANGE");

    await tx.clubSubscription.update({
      where,
      data: {
        status: patch.status,
        pastDueSince: patch.pastDueSince,
        ...(patch.currentPeriodEnd ? { currentPeriodEnd: patch.currentPeriodEnd } : {}),
        lastEventAt: event.occurredAt,
        cancelAtPeriodEnd: patch.status === "CANCELLED" ? false : sub.cancelAtPeriodEnd,
      },
    });
    await reconcileClubTier(tx, sub.clubId, now);
    return finish("APPLIED");
  });
}
