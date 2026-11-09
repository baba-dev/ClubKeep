import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        // Dev fallback: Logs OTP in server console
        // In production, plug in SMS provider (Twilio, AWS SNS, Msg91, etc.)
        console.log(`\n========================================`);
        console.log(`[SMS OTP] To: ${phoneNumber}`);
        console.log(`[SMS OTP] Verification Code: ${code}`);
        console.log(`========================================\n`);
      },
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export type Auth = typeof auth;
