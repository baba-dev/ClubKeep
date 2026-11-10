-- Privileged platform operators are separate from legacy User.role and tenant roles.
-- Existing users remain USER; no existing credentials or memberships change.
BEGIN;
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN');
ALTER TABLE "user"
  ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
COMMIT;
