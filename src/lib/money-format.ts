export function currencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    throw new Error("Unsupported currency");
  }
}

export function formatMinorMoney(priceMinor: number, currency: string): string {
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat("en", {
    style: "currency", currency, maximumFractionDigits: digits,
  }).format(priceMinor / 10 ** digits);
}

export function parseMinorMoney(value: string, currency: string): number | null {
  const digits = currencyDigits(currency);
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(value)) return null;
  const number = Number(value);
  const minor = Math.round(number * 10 ** digits);
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > 100000000) return null;
  if (Math.abs(number * 10 ** digits - minor) > 0.000001) return null;
  return minor;
}
