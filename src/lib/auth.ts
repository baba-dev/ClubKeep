import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { mayRemovePasskey } from "@/lib/passkey-policy";
import { isRecentProviderLinkSession } from "@/lib/provider-link-policy";
import { createConfiguredLimiter } from "@/lib/auth-rate-limit";
import { sendMagicLinkEmail } from "@/lib/mail-transport";
import { maySendLoginLink } from "@/lib/magic-link-policy";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { requireAuthConfig } from "@/lib/server-env";
import { resolveAuthConfig } from "@/lib/auth-config";
import { getGoogleProvider, GOOGLE_ACCOUNT_LINK_POLICY } from "@/lib/oauth-policy";

const { secret, baseURL } = requireAuthConfig();
const config = resolveAuthConfig();
export const authLimiter = createConfiguredLimiter(config, secret);
const limiter = authLimiter;

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
    ...(config.features.passkey && config.webauthn
      ? [
          passkey({
            rpID: config.webauthn.rpID,
            rpName: "ClubKeep",
            origin: config.webauthn.origin,
            registration: { requireSession: true },
            authenticatorSelection: { userVerification: "required" },
          }),
        ]
      : []),
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
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/magic-link": { window: 900, max: 10 },
      "/magic-link/verify": { window: 300, max: 10 },
      "/sign-in/passkey": { window: 300, max: 15 },
      "/passkey/*": { window: 60, max: 20 },
      "/sign-in/email": { window: 900, max: 15 },
    },
    ...(limiter ? { customStorage: limiter.customStorage } : {}),
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/link-social") {
        if (!ctx.headers) {
          throw new APIError("UNAUTHORIZED", { message: "Authentication required" });
        }
        const session = await auth.api.getSession({ headers: ctx.headers });
        if (
          !session?.user ||
          !session.session ||
          !isRecentProviderLinkSession(new Date(session.session.createdAt).getTime(), Date.now())
        ) {
          throw new APIError("FORBIDDEN", {
            message: "Sign in again before linking an account",
          });
        }
      }
      if (ctx.path === "/sign-in/magic-link") {
        if (!config.features.emailLink || !limiter) {
          throw new APIError("FORBIDDEN", { message: "Email sign-in unavailable" });
        }
        const value = String(ctx.body?.email ?? "")
          .trim()
          .toLowerCase();
        if (!value || value.length > 254) {
          throw new APIError("BAD_REQUEST", { message: "Invalid email" });
        }
        const result = await limiter.consume("email-request", value, 900, 3);
        if (!result.allowed) {
          throw new APIError("TOO_MANY_REQUESTS", { message: "Please try again later" });
        }
      }
      if (ctx.path !== "/passkey/delete-passkey") return;
      // Every call to the underlying Better Auth deletion route is checked;
      // this cannot be bypassed by skipping our own UI.
      if (!ctx.headers) {
        throw new APIError("UNAUTHORIZED", { message: "Authentication required" });
      }
      const session = await auth.api.getSession({ headers: ctx.headers });
      if (!session?.user || !session.session) {
        throw new APIError("UNAUTHORIZED", { message: "Authentication required" });
      }
      const userId = session.user.id;
      const [count, accounts] = await Promise.all([
        prisma.passkey.count({ where: { userId } }),
        prisma.account.findMany({
          where: { userId },
          select: { providerId: true },
        }),
      ]);
      if (
        !mayRemovePasskey({
          passkeys: count,
          providerIds: accounts.map((account) => account.providerId),
          verifiedEmailRecovery: config.features.emailLink && session.user.emailVerified,
          sessionCreatedAt: new Date(session.session.createdAt).getTime(),
          now: Date.now(),
        })
      ) {
        throw new APIError("FORBIDDEN", {
          message: "Recent sign-in and another recovery method are required",
        });
      }
    }),
  },

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
