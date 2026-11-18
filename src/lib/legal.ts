// Single source for the sign-in notice and the Terms and Privacy pages, so the
// age, operator and paths cannot drift between them. See docs/LEGAL_DRAFTS.md.

/** A statement, not a check: nothing verifies age (owner decision, 18 Nov 2026). */
export const MINIMUM_ACCOUNT_AGE = 13;
export const OPERATOR_NAME = "BabaBuilds";
export const TERMS_PATH = "/legal/terms";
export const PRIVACY_PATH = "/legal/privacy";
/** Date of the last substantive change to either page (ISO). Update with every edit. */
export const LEGAL_LAST_UPDATED = "2026-11-18";

/**
 * A monitored mailbox for privacy and support questions. Left unset until the
 * owner supplies one: the pages never show a made-up address, and the
 * sections that depend on a contact are omitted while it is null.
 */
export const LEGAL_SETTINGS = { contactEmail: null as string | null };

/** The contact address if it is a plausible email address, otherwise null. */
export function validContact(email: string | null): string | null {
  const value = email?.trim() ?? "";
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(value) && value.length <= 254
    ? value
    : null;
}

export function formatLegalDate(iso: string): string {
  const date = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
