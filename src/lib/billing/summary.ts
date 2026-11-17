import type { PrismaClient } from "@/generated/prisma/client";
import { countMemberSeats, MEMBER_LIMITS } from "@/lib/business-entitlements";
import { billingEnabled, readTaxBasisPoints } from "@/lib/billing/config";
import {
  BILLABLE_TIERS,
  currencyForCountry,
  effectiveTier,
  LIST_PRICE_MINOR,
  priceWithTax,
  type BillingCurrency,
} from "@/lib/billing/policy";
import { billingView } from "@/lib/billing/view";

/** Everything the owner billing page needs, read-only and tenant-scoped by clubId. */
export async function billingSummary(db: PrismaClient, clubId: string, now = new Date()) {
  const club = await db.club.findUniqueOrThrow({
    where: { id: clubId },
    select: {
      name: true,
      timeZone: true,
      businessTier: true,
      setupProgress: { select: { countryCode: true } },
      billingSubscription: {
        select: {
          tier: true,
          status: true,
          currentPeriodEnd: true,
          pastDueSince: true,
          cancelAtPeriodEnd: true,
          currency: true,
          chargeAmountMinor: true,
        },
      },
    },
  });
  const sub = club.billingSubscription;
  const rawCountry = club.setupProgress?.countryCode ?? null;
  const countryCode = rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  const tier = effectiveTier(sub, club.businessTier, now);
  const view = billingView({ enabled: billingEnabled(), countryCode, subscription: sub, now });
  const currency: BillingCurrency | null = countryCode ? currencyForCountry(countryCode) : null;
  const tax = readTaxBasisPoints();
  return {
    clubName: club.name,
    timeZone: club.timeZone,
    tier,
    seatsUsed: await countMemberSeats(db, clubId),
    seatLimit: MEMBER_LIMITS[tier],
    countryCode,
    currency,
    taxBasisPoints: tax,
    prices: currency
      ? BILLABLE_TIERS.map((t) => {
          const listMinor = LIST_PRICE_MINOR[currency][t];
          return {
            tier: t,
            listMinor,
            totalMinor: tax === null ? null : priceWithTax(listMinor, tax),
          };
        })
      : [],
    subscription: sub && {
      tier: sub.tier,
      status: sub.status,
      currency: sub.currency,
      chargeAmountMinor: sub.chargeAmountMinor,
    },
    view,
  };
}
