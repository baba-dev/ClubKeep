/** Require a fresh verified sign-in before linking another identity provider. */
export function isRecentProviderLinkSession(createdAt: number, now: number): boolean {
  return (
    Number.isFinite(createdAt) &&
    Number.isFinite(now) &&
    createdAt <= now &&
    now - createdAt <= 10 * 60 * 1000
  );
}
