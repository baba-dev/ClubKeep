import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { requireAuthConfig } from "@/lib/server-env";

const { secret, baseURL } = requireAuthConfig();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Preserve existing password accounts. Google, magic links and passkeys
  // are separately delivered in Phase 0C after schema reviews in 0B.
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  // No SMS provider, no phone OTP plugin, and no logging verification codes.
  secret,
  baseURL,
});

export type Auth = typeof auth;
