-- B4 ledger: additive, no changes to membership terms or existing prices.
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECORDED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_REVERSED';
CREATE TYPE "ClubPaymentMethod" AS ENUM ('CASH','UPI','CARD','OTHER');

ALTER TABLE "Club" ADD COLUMN "receiptSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD CONSTRAINT "Club_receiptSequence_check" CHECK ("receiptSequence" >= 0);
CREATE UNIQUE INDEX "MemberSubscription_clubId_id_key" ON "MemberSubscription"("clubId","id");

CREATE TABLE "ClubPayment" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "memberRecordId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "receiptNo" INTEGER NOT NULL,
  "operationKey" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "method" "ClubPaymentMethod" NOT NULL,
  "externalReference" VARCHAR(120),
  "note" VARCHAR(240),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByUserId" TEXT NOT NULL,
  "clubName" VARCHAR(200) NOT NULL,
  "memberName" VARCHAR(100) NOT NULL,
  "memberNumber" INTEGER NOT NULL,
  "planName" VARCHAR(90) NOT NULL,
  "termPriceMinor" INTEGER NOT NULL,
  "termStartsAt" TIMESTAMP(3) NOT NULL,
  "termEndsAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClubPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClubPayment_amount_check" CHECK ("amountMinor" > 0 AND "amountMinor" <= 100000000),
  CONSTRAINT "ClubPayment_receipt_check" CHECK ("receiptNo" > 0),
  CONSTRAINT "ClubPayment_termPrice_check" CHECK ("termPriceMinor" >= 0),
  CONSTRAINT "ClubPayment_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "ClubPayment_memberNumber_check" CHECK ("memberNumber" >= 0),
  CONSTRAINT "ClubPayment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClubPayment_clubId_memberRecordId_fkey" FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClubPayment_clubId_subscriptionId_fkey" FOREIGN KEY ("clubId","subscriptionId") REFERENCES "MemberSubscription"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClubPayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubPayment_operationKey_key" ON "ClubPayment"("operationKey");
CREATE UNIQUE INDEX "ClubPayment_clubId_id_key" ON "ClubPayment"("clubId","id");
CREATE UNIQUE INDEX "ClubPayment_clubId_receiptNo_key" ON "ClubPayment"("clubId","receiptNo");
CREATE INDEX "ClubPayment_clubId_receivedAt_id_idx" ON "ClubPayment"("clubId","receivedAt" DESC,"id" DESC);
CREATE INDEX "ClubPayment_clubId_memberRecordId_createdAt_idx" ON "ClubPayment"("clubId","memberRecordId","createdAt" DESC);
CREATE INDEX "ClubPayment_clubId_subscriptionId_idx" ON "ClubPayment"("clubId","subscriptionId");

CREATE TABLE "ClubPaymentReversal" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "reason" VARCHAR(240) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedByUserId" TEXT NOT NULL,
  CONSTRAINT "ClubPaymentReversal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClubPaymentReversal_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 8 AND 240),
  CONSTRAINT "ClubPaymentReversal_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClubPaymentReversal_clubId_paymentId_fkey" FOREIGN KEY ("clubId","paymentId") REFERENCES "ClubPayment"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClubPaymentReversal_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubPaymentReversal_paymentId_key" ON "ClubPaymentReversal"("paymentId");
CREATE INDEX "ClubPaymentReversal_clubId_createdAt_idx" ON "ClubPaymentReversal"("clubId","createdAt" DESC);

-- A reversal is the only correction path; financial entries cannot be edited or deleted.
CREATE FUNCTION clubkeep_finance_append_only() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ClubKeep finance ledger is append-only; create a reversal instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ClubPayment_immutable"
  BEFORE UPDATE OR DELETE ON "ClubPayment"
  FOR EACH ROW EXECUTE FUNCTION clubkeep_finance_append_only();
CREATE TRIGGER "ClubPaymentReversal_immutable"
  BEFORE UPDATE OR DELETE ON "ClubPaymentReversal"
  FOR EACH ROW EXECUTE FUNCTION clubkeep_finance_append_only();
