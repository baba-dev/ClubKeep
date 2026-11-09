/**
 * Better Auth's passkey delete endpoint cannot remove the last usable factor.
 * Deletion also needs a genuinely recent sign-in rather than a mere still-live
 * 30-day session. A club invitation/phone is never a recovery method.
 */
export function mayRemovePasskey(input: {
  passkeys: number;
  providerIds: readonly string[];
  verifiedEmailRecovery: boolean;
  sessionCreatedAt: number;
  now: number;
}): boolean {
  if (!Number.isFinite(input.sessionCreatedAt) ||
      input.sessionCreatedAt > input.now ||
      input.now - input.sessionCreatedAt > 10 * 60 * 1000) {
    return false;
  }
  if (input.passkeys > 1) return true;
  if (input.passkeys < 1) return false;
  const hasLinkedAccount = input.providerIds.some(
    (provider) => provider === "google" || provider === "credential"
  );
  return hasLinkedAccount || input.verifiedEmailRecovery;
}
