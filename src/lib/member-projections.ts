import type { PrismaClient } from "@/generated/prisma/client";
import { financeBalance } from "@/lib/finance-service";
import { statusForTerm } from "@/lib/membership-dates";

/** Strict, bounded, tenant-and-roster-filtered projections; no Personal or operator data. */
export async function memberArenaSnapshot(
  db: PrismaClient,
  clubId: string,
  memberRecordId: string
) {
  const [terms, visits, visitCount] = await Promise.all([
    db.memberSubscription.findMany({
      where: { clubId, memberRecordId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        planName: true,
        priceMinor: true,
        currency: true,
        startAt: true,
        endAt: true,
        cancelledAt: true,
      },
    }),
    db.clubAttendance.findMany({
      where: { clubId, memberRecordId },
      orderBy: [{ checkedInAt: "desc" }, { id: "desc" }],
      take: 3,
      select: { id: true, localDate: true, checkedInAt: true, method: true },
    }),
    db.clubAttendance.count({ where: { clubId, memberRecordId } }),
  ]);
  const totals = terms.length
    ? await db.clubPayment.groupBy({
        by: ["subscriptionId"],
        where: {
          clubId,
          memberRecordId,
          subscriptionId: { in: terms.map((term) => term.id) },
          reversal: { is: null },
        },
        _sum: { amountMinor: true },
      })
    : [];
  const paidByTerm = new Map(totals.map((t) => [t.subscriptionId, t._sum.amountMinor ?? 0]));
  return {
    terms: terms.map((term) => {
      const paidMinor = paidByTerm.get(term.id) ?? 0;
      return {
        ...term,
        status: statusForTerm(term),
        paidMinor,
        dueMinor: term.cancelledAt ? 0 : financeBalance(term.priceMinor, paidMinor),
      };
    }),
    recentVisits: visits,
    visitCount,
  };
}

export async function memberAttendancePage(
  db: PrismaClient,
  clubId: string,
  memberRecordId: string,
  cursor?: string
) {
  return db.clubAttendance.findMany({
    where: { clubId, memberRecordId },
    orderBy: [{ checkedInAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, checkedInAt: true, localDate: true, method: true },
  });
}

export async function memberPaymentPage(
  db: PrismaClient,
  clubId: string,
  memberRecordId: string,
  cursor?: string
) {
  return db.clubPayment.findMany({
    where: { clubId, memberRecordId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      receiptNo: true,
      planName: true,
      currency: true,
      amountMinor: true,
      receivedAt: true,
      method: true,
      reversal: { select: { id: true } },
    },
  });
}

/** Member-visible receipt: never return staff notes, bank reference or internal audit actors. */
export async function memberReceipt(
  db: PrismaClient,
  clubId: string,
  memberRecordId: string,
  paymentId: string
) {
  return db.clubPayment.findFirst({
    where: { id: paymentId, clubId, memberRecordId },
    select: {
      id: true,
      receiptNo: true,
      clubName: true,
      memberName: true,
      memberNumber: true,
      planName: true,
      currency: true,
      termPriceMinor: true,
      termStartsAt: true,
      termEndsAt: true,
      amountMinor: true,
      method: true,
      receivedAt: true,
      reversal: { select: { id: true, createdAt: true } },
    },
  });
}
