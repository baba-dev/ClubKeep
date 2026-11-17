-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('RAZORPAY', 'STRIPE');

-- CreateEnum
CREATE TYPE "ClubSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEventType" ADD VALUE 'BILLING_SUBSCRIPTION_STARTED';
ALTER TYPE "SecurityEventType" ADD VALUE 'BILLING_TIER_CHANGED';
ALTER TYPE "SecurityEventType" ADD VALUE 'BILLING_CANCEL_REQUESTED';

-- CreateTable
CREATE TABLE "ClubSubscription" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "tier" "BusinessTier" NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "status" "ClubSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "providerSubscriptionId" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "chargeAmountMinor" INTEGER NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "pastDueSince" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "lastEventAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" VARCHAR(80) NOT NULL,
    "outcome" VARCHAR(24) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubSubscription_clubId_key" ON "ClubSubscription"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSubscription_provider_providerSubscriptionId_key" ON "ClubSubscription"("provider", "providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_providerEventId_key" ON "BillingWebhookEvent"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "ClubSubscription" ADD CONSTRAINT "ClubSubscription_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Database-level guards (not expressible in Prisma schema). A paid subscription is
-- never the FREE tier, prices are positive integers, and codes are normalized.
ALTER TABLE "ClubSubscription"
  ADD CONSTRAINT "ClubSubscription_tier_paid_check" CHECK ("tier" <> 'FREE'),
  ADD CONSTRAINT "ClubSubscription_amount_check" CHECK ("amountMinor" > 0 AND "chargeAmountMinor" >= "amountMinor"),
  ADD CONSTRAINT "ClubSubscription_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "ClubSubscription_country_check" CHECK ("countryCode" ~ '^[A-Z]{2}$');
