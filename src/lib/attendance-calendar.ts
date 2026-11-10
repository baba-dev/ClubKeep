/** Timezone-aware civil date key for an immutable club attendance day. */
export function isValidClubTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function clubLocalDate(now: Date, timeZone: string): string {
  if (!isValidClubTimeZone(timeZone)) throw new Error("Club time zone is not configured");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory",
  }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return [get("year"), get("month"), get("day")].join("-");
}

export function clockForClub(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(now);
}
