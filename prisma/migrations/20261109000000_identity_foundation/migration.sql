-- Phase 0B: additive identity foundation. Requires exact 0_init_auth_core
-- tables. Existing session/account/user/verification records are preserved.
-- A detected account/provider duplicate causes a transaction-level failure.
-- No medical records, phone verification, SMS, or production provisioning.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "account" GROUP BY "providerId", "accountId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate provider identity: reconcile account rows before applying 0B';
  END IF;
END $$;

CREATE TYPE "ClubStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'MEMBER');
CREATE TYPE "ClubMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LEFT');
CREATE TYPE "ClubContactSource" AS ENUM ('OWNER_ENTERED', 'USER_ENTERED', 'GOOGLE_IMPORTED');
CREATE TYPE "SecurityEventType" AS ENUM (
  'CLUB_CREATED', 'INVITE_CREATED', 'INVITE_REVOKED',
  'INVITE_CLAIMED', 'MEMBERSHIP_CHANGED', 'SECURITY_REVIEW'
);

-- Legacy phone is retained verbatim but no longer a global uniqueness or
-- account-linking key; phone contacts use ClubContact.
DROP INDEX "user_phoneNumber_key";
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
CREATE INDEX "verification_expiresAt_idx" ON "verification"("expiresAt");

CREATE TABLE "passkey" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "publicKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "credentialID" TEXT NOT NULL,
  "counter" INTEGER NOT NULL,
  "deviceType" TEXT NOT NULL,
  "backedUp" BOOLEAN NOT NULL,
  "transports" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "aaguid" TEXT,
  CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonalProfile" (
  "userId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Club" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ClubStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubMembership" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
  "status" "ClubMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubInvite" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "issuedByUserId" TEXT NOT NULL,
  "claimedByUserId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "tokenKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "ClubInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubContact" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "membershipId" TEXT,
  "phoneE164" TEXT,
  "source" "ClubContactSource" NOT NULL DEFAULT 'OWNER_ENTERED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClubContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "clubId" TEXT,
  "eventType" "SecurityEventType" NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "passkey_credentialID_key" ON "passkey"("credentialID");
CREATE INDEX "passkey_userId_idx" ON "passkey"("userId");
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");
CREATE UNIQUE INDEX "ClubMembership_clubId_userId_key" ON "ClubMembership"("clubId", "userId");
CREATE UNIQUE INDEX "ClubMembership_clubId_id_key" ON "ClubMembership"("clubId", "id");
CREATE INDEX "ClubMembership_userId_status_idx" ON "ClubMembership"("userId", "status");
CREATE INDEX "ClubMembership_clubId_status_role_idx" ON "ClubMembership"("clubId", "status", "role");
CREATE UNIQUE INDEX "ClubInvite_tokenHash_key" ON "ClubInvite"("tokenHash");
CREATE INDEX "ClubInvite_clubId_expiresAt_idx" ON "ClubInvite"("clubId", "expiresAt");
CREATE INDEX "ClubInvite_claimedByUserId_idx" ON "ClubInvite"("claimedByUserId");
CREATE INDEX "ClubInvite_issuedByUserId_idx" ON "ClubInvite"("issuedByUserId");
CREATE INDEX "ClubContact_clubId_phoneE164_idx" ON "ClubContact"("clubId", "phoneE164");
CREATE INDEX "ClubContact_membershipId_idx" ON "ClubContact"("membershipId");
CREATE INDEX "SecurityEvent_actorUserId_createdAt_idx" ON "SecurityEvent"("actorUserId", "createdAt");
CREATE INDEX "SecurityEvent_clubId_createdAt_idx" ON "SecurityEvent"("clubId", "createdAt");

ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalProfile" ADD CONSTRAINT "PersonalProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubInvite" ADD CONSTRAINT "ClubInvite_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubInvite" ADD CONSTRAINT "ClubInvite_issuedByUserId_fkey"
  FOREIGN KEY ("issuedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubInvite" ADD CONSTRAINT "ClubInvite_claimedByUserId_fkey"
  FOREIGN KEY ("claimedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClubContact" ADD CONSTRAINT "ClubContact_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubContact" ADD CONSTRAINT "ClubContact_clubId_membershipId_fkey"
  FOREIGN KEY ("clubId", "membershipId") REFERENCES "ClubMembership"("clubId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
