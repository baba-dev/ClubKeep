import type { PrismaClient } from "@/generated/prisma/client";

// Kept free of service imports so integration tests can load it under Node's type-stripping mode.
export function asSafeNumber(value: bigint | number | null): number {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number))
    throw new Error("Finance amount is outside safe integer range");
  return number;
}

export async function financeMonthlyTrend(db: PrismaClient, clubId: string, timeZone: string) {
  const cutoff = new Date(Date.now() - 215 * 86400000);
  const rows = await db.$queryRaw<Array<{ month: string; currency: string; amount: bigint }>>`
    -- receivedAt is zone-less UTC: tag it as UTC first, then convert to club-local time.
    SELECT to_char((p."receivedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone},'YYYY-MM') AS month,
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
