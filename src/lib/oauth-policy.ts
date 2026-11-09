import type { AuthFeatureConfig } from "@/lib/auth-config";

/**
 * OAuth identity is the Google provider subject (`sub`), never a phone number.
 * Only request OIDC basic profile/email; People API and offline tokens are
 * deliberately out of scope for registration.
 */
export function getGoogleProvider(config: AuthFeatureConfig) {
  if (!config.features.google || !config.google) return {};
  return {
    google: {
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      scope: ["openid", "email", "profile"],
      disableDefaultScope: true,
      prompt: "select_account" as const,
    },
  };
}

export const GOOGLE_ACCOUNT_LINK_POLICY = {
  enabled: true,
  disableImplicitLinking: true,
  allowDifferentEmails: false,
  allowUnlinkingAll: false,
  updateUserInfoOnLink: false,
} as const;
