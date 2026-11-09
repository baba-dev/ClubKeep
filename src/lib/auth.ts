import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { sendMagicLinkEmail } from "@/lib/mail-transport";
import { maySendLoginLink } from "@/lib/magic-link-policy";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { requireAuthConfig } from "@/lib/server-env";
import { resolveAuthConfig } from "@/lib/auth-config";
import { getGoogleProvider, GOOGLE_ACCOUNT_LINK_POLICY } from "@/lib/oauth-policy";

const { secret, baseURL } = requireAuthConfig();
const config = resolveAuthConfig();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret,
  baseURL,
  trustedOrigins: [config.origin],
  account: { accountLinking: GOOGLE_ACCOUNT_LINK_POLICY },

  // Never silently lock out previously enrolled password users. New signup
  // must proceed through independently verified Google/email magic links.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: false,
  },

  socialProviders: getGoogleProvider(config),
  plugins: [
    ...(config.features.emailLink
      ? [
          magicLink({
            expiresIn: 300,
            storeToken: "hashed",
            disableSignUp: false,
            rateLimit: { window: 60, max: 3 },
            sendMagicLink: async ({ email, token }) => {
              // An old, never-verified password account must not lose its
              // password or sessions due to magic-link verification.
              if (!(await maySendLoginLink(prisma, email))) return;
              await sendMagicLinkEmail(email, token, config);
            },
          }),
        ]
      : []),
  ],
  advanced: {
    // Only trust an operator-confirmed, Nginx-overwritten header. Never accept
    // arbitrary X-Forwarded-For from the public Internet.
    ipAddress: { ipAddressHeaders: config.trustedIpHeader ? [config.trustedIpHeader] : [] },
  },
  session: { cookieCache: { enabled: false } },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // One independent Personal profile exists even with zero clubs.
          // Idempotent against concurrent OAuth creation callbacks.
          await prisma.personalProfile.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
