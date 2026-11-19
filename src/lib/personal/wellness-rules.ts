/** Pure user-facing math: absent observations stay null, never zero. */
export function sleepMinutes(startedAt: Date, endedAt: Date): number {
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
}
export function localDate(at: Date, zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(at);
    const part = (name: string) => parts.find((x) => x.type === name)?.value ?? "";
    return part("year") + "-" + part("month") + "-" + part("day");
  } catch {
    return at.toISOString().slice(0, 10);
  }
}
export function mondayUtc(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7));
  return result;
}
export function safeRate(numerator: number, denominator: number): number | null {
  return denominator <= 0 ? null : Math.round((numerator / denominator) * 100);
}
