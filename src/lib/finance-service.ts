import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubActive } from "@/lib/member-service";
import { OnboardingError } from "@/lib/club-onboarding";
import type { RecordClubPaymentInput } from "@/lib/validations/finance";

function asSafeNumber(value: bigint | number | null): number {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number))
    throw new Error("Finance amount is outside safe integer range");
  return number;
}
export function financeBalance(priceMinor: number, paidMinor: number) {
  return Math.max(0, priceMinor - paidMinor);
}
export function receiptNumber(sequence: number) {
  return "CK-" + String(sequence).padStart(7, "0");
}

export async function recordClubPayment(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  input: RecordClubPaymentInput
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER", "STAFF"]);
    // Acquire the club lock BEFORE the idempotency and balance checks; serialize all concurrent financial mutations.
    const club = await tx.club.update({
      where: { id: clubId },
      data: { updatedAt: new Date() },
      select: { name: true },
    });
    const repeat = await tx.clubPayment.findUnique({ where: { operationKey: input.operationKey } });
    if (repeat) {
      if (
        repeat.clubId !== clubId ||
        repeat.memberRecordId !== input.memberId ||
        repeat.subscriptionId !== input.subscriptionId ||
        repeat.recordedByUserId !== actorId ||
        repeat.amountMinor !== input.amountMinor ||
        repeat.method !== input.method ||
        (repeat.externalReference ?? "") !== input.externalReference ||
        (repeat.note ?? "") !== input.note
      )
        throw new OnboardingError(409, "Idempotency key is already used for a different payment");
      return { id: repeat.id, receiptNo: repeat.receiptNo, repeated: true };
    }
    // B1 renew/cancel/archive take the roster row lock. Share it to prevent
    // recording a payment while a term is concurrently cancelled or archived.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ClubMemberRecord"
      WHERE "id"=${input.memberId} AND "clubId"=${clubId} AND "status"='ACTIVE'
      FOR UPDATE
    `;
    if (locked.length !== 1) throw new OnboardingError(404, "Active club member not found");
    const term = await tx.memberSubscription.findFirst({
      where: {
        id: input.subscriptionId,
        clubId,
        memberRecordId: input.memberId,
        cancelledAt: null,
      },
      select: {
        id: true,
        priceMinor: true,
        currency: true,
        planName: true,
        startAt: true,
        endAt: true,
        memberRecord: { select: { status: true, memberNumber: true, displayName: true } },
      },
    });
    if (!term || term.memberRecord.status !== "ACTIVE")
      throw new OnboardingError(404, "Active membership term not found");
    const sums = await tx.clubPayment.aggregate({
      where: { clubId, subscriptionId: term.id, reversal: { is: null } },
      _sum: { amountMinor: true },
    });
    if (input.amountMinor > financeBalance(term.priceMinor, sums._sum.amountMinor ?? 0))
      throw new OnboardingError(409, "Payment exceeds remaining membership dues");
    const receipt = await tx.club.update({
      where: { id: clubId },
      data: { receiptSequence: { increment: 1 } },
      select: { receiptSequence: true },
    });
    const record = await tx.clubPayment.create({
      data: {
        clubId,
        memberRecordId: input.memberId,
        subscriptionId: term.id,
        receiptNo: receipt.receiptSequence,
        operationKey: input.operationKey,
        amountMinor: input.amountMinor,
        currency: term.currency,
        method: input.method,
        externalReference: input.externalReference || null,
        note: input.note || null,
        recordedByUserId: actorId,
        clubName: club.name,
        memberName: term.memberRecord.displayName,
        memberNumber: term.memberRecord.memberNumber,
        planName: term.planName,
        termPriceMinor: term.priceMinor,
        termStartsAt: term.startAt,
        termEndsAt: term.endAt,
      },
      select: { id: true, receiptNo: true },
    });
    await tx.securityEvent.create({
      data: { clubId, actorUserId: actorId, eventType: "PAYMENT_RECORDED", referenceId: record.id },
    });
    return { ...record, repeated: false };
  });
}

export async function reverseClubPayment(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  paymentId: string,
  reason: string
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    await tx.club.update({ where: { id: clubId }, data: { updatedAt: new Date() } });
    const payment = await tx.clubPayment.findFirst({
      where: { clubId, id: paymentId },
      select: {
        id: true,
        reversal: { select: { id: true, reason: true, reversedByUserId: true } },
      },
    });
    if (!payment) throw new OnboardingError(404, "Payment not found");
    if (payment.reversal) {
      if (payment.reversal.reason === reason && payment.reversal.reversedByUserId === actorId)
        return { id: payment.reversal.id, repeated: true };
      throw new OnboardingError(409, "Payment has already been reversed");
    }
    const reversal = await tx.clubPaymentReversal.create({
      data: { clubId, paymentId, reason, reversedByUserId: actorId },
      select: { id: true },
    });
    await tx.securityEvent.create({
      data: { clubId, actorUserId: actorId, eventType: "PAYMENT_REVERSED", referenceId: paymentId },
    });
    return { ...reversal, repeated: false };
  });
}

export type FinanceAmount = {
  currency: string;
  charged: number;
  collected: number;
  outstanding: number;
  overdue: number;
  terms: number;
};
export async function clubFinanceSummary(
  db: PrismaClient,
  clubId: string
): Promise<FinanceAmount[]> {
  const termTotals = await db.$queryRaw<
    Array<{
      currency: string;
      charged: bigint;
      outstanding: bigint;
      overdue: bigint;
      terms: bigint;
    }>
  >`
    WITH paid AS (
      SELECT p."subscriptionId",SUM(p."amountMinor")::bigint AS value
      FROM "ClubPayment" p LEFT JOIN "ClubPaymentReversal" r ON r."paymentId"=p."id"
      WHERE p."clubId"=${clubId} AND r."id" IS NULL GROUP BY p."subscriptionId"
    )
    SELECT t."currency",SUM(t."priceMinor")::bigint AS charged,
      SUM(GREATEST(t."priceMinor"-COALESCE(paid.value,0),0))::bigint AS outstanding,
      SUM(CASE WHEN t."endAt"<now() THEN GREATEST(t."priceMinor"-COALESCE(paid.value,0),0) ELSE 0 END)::bigint AS overdue,
      count(*)::bigint AS terms
    FROM "MemberSubscription" t LEFT JOIN paid ON paid."subscriptionId"=t."id"
    WHERE t."clubId"=${clubId} AND t."cancelledAt" IS NULL
    GROUP BY t."currency"
  `;
  const received = await db.clubPayment.groupBy({
    by: ["currency"],
    where: { clubId, reversal: { is: null } },
    _sum: { amountMinor: true },
  });
  const totals = new Map<string, FinanceAmount>();
  for (const t of termTotals)
    totals.set(t.currency, {
      currency: t.currency,
      charged: asSafeNumber(t.charged),
      collected: 0,
      outstanding: asSafeNumber(t.outstanding),
      overdue: asSafeNumber(t.overdue),
      terms: asSafeNumber(t.terms),
    });
  for (const p of received) {
    const existing = totals.get(p.currency) ?? {
      currency: p.currency,
      charged: 0,
      collected: 0,
      outstanding: 0,
      overdue: 0,
      terms: 0,
    };
    existing.collected = p._sum.amountMinor ?? 0;
    totals.set(p.currency, existing);
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
export async function recentClubPayments(db: PrismaClient, clubId: string, cursor?: string) {
  return db.clubPayment.findMany({
    where: { clubId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      receiptNo: true,
      amountMinor: true,
      currency: true,
      method: true,
      memberName: true,
      memberRecordId: true,
      planName: true,
      createdAt: true,
      receivedAt: true,
      reversal: { select: { reason: true, createdAt: true } },
    },
  });
}
export async function memberClubFinance(db: PrismaClient, clubId: string, memberId: string) {
  const terms = await db.memberSubscription.findMany({
    where: { clubId, memberRecordId: memberId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 80,
    select: {
      id: true,
      planName: true,
      priceMinor: true,
      currency: true,
      createdAt: true,
      cancelledAt: true,
      endAt: true,
      payments: {
        select: {
          id: true,
          amountMinor: true,
          receiptNo: true,
          receivedAt: true,
          method: true,
          reversal: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  const aggregates = terms.length
    ? await db.clubPayment.groupBy({
        by: ["subscriptionId"],
        where: {
          clubId,
          memberRecordId: memberId,
          subscriptionId: { in: terms.map((t) => t.id) },
          reversal: { is: null },
        },
        _sum: { amountMinor: true },
      })
    : [];
  const paidByTerm = new Map(aggregates.map((a) => [a.subscriptionId, a._sum.amountMinor ?? 0]));
  return terms.map((term) => {
    const paid = paidByTerm.get(term.id) ?? 0;
    return {
      ...term,
      paidMinor: paid,
      dueMinor: term.cancelledAt ? 0 : financeBalance(term.priceMinor, paid),
    };
  });
}
export async function clubDuesPage(db: PrismaClient, clubId: string, cursor?: string) {
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      memberRecordId: string;
      memberName: string;
      memberNumber: number;
      planName: string;
      currency: string;
      priceMinor: number;
      paidMinor: bigint;
      dueMinor: bigint;
      endAt: Date;
    }>
  >`
    WITH paid AS (
      SELECT p."subscriptionId",SUM(p."amountMinor")::bigint AS value
      FROM "ClubPayment" p LEFT JOIN "ClubPaymentReversal" r ON r."paymentId"=p."id"
      WHERE p."clubId"=${clubId} AND r."id" IS NULL GROUP BY p."subscriptionId"
    )
    SELECT t."id",t."memberRecordId",m."displayName" AS "memberName",m."memberNumber",
      t."planName",t."currency",t."priceMinor",COALESCE(paid.value,0)::bigint AS "paidMinor",
      GREATEST(t."priceMinor"-COALESCE(paid.value,0),0)::bigint AS "dueMinor",t."endAt"
    FROM "MemberSubscription" t
    JOIN "ClubMemberRecord" m ON m."id"=t."memberRecordId" AND m."clubId"=t."clubId"
    LEFT JOIN paid ON paid."subscriptionId"=t."id"
    WHERE t."clubId"=${clubId} AND t."cancelledAt" IS NULL
      AND t."priceMinor">COALESCE(paid.value,0)
      AND t."id">${cursor ?? ""}
    ORDER BY t."id" ASC LIMIT 51
  `;
  return rows.map((r) => ({
    ...r,
    paidMinor: asSafeNumber(r.paidMinor),
    dueMinor: asSafeNumber(r.dueMinor),
  }));
}

export async function financeMonthlyTrend(db: PrismaClient, clubId: string, timeZone: string) {
  const cutoff = new Date(Date.now() - 215 * 86400000);
  const rows = await db.$queryRaw<Array<{ month: string; currency: string; amount: bigint }>>`
    SELECT to_char(p."receivedAt" AT TIME ZONE ${timeZone},'YYYY-MM') AS month,
      p."currency",SUM(p."amountMinor")::bigint AS amount
    FROM "ClubPayment" p LEFT JOIN "ClubPaymentReversal" r ON r."paymentId"=p."id"
    WHERE p."clubId"=${clubId} AND p."receivedAt">=${cutoff} AND r."id" IS NULL
    GROUP BY month,p."currency" ORDER BY month ASC,p."currency" ASC
  `;
  return rows.map((row) => ({
    month: row.month,
    currency: row.currency,
    amount: asSafeNumber(row.amount),
  }));
}
