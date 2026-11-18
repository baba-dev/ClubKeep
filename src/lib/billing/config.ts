import { z } from "zod";
import { BILLABLE_TIERS, type BillableTier } from "@/lib/billing/policy";

type Source = Record<string, string | undefined>;

const schema = z.object({
  BILLING_ENABLED: z.string().optional(),
  BILLING_TAX_BASIS_POINTS: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_STARTER: z.string().optional(),
  RAZORPAY_PLAN_GROWTH: z.string().optional(),
  RAZORPAY_PLAN_PRO: z.string().optional(),
});

export type RazorpayConfig = Readonly<{
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  plans: Readonly<Record<BillableTier, string>>;
  taxBasisPoints: number;
}>;

/** Billing stays off unless the operator explicitly sets BILLING_ENABLED=true. */
export function billingEnabled(source: Source = process.env): boolean {
  return source.BILLING_ENABLED === "true";
}

function need(value: string | undefined, key: string): string {
  if (!value?.trim()) throw new Error("Missing billing setting: " + key);
  return value.trim();
}

/** Throws with key names only, never values. */
export function requireRazorpayConfig(source: Source = process.env): RazorpayConfig {
  const env = schema.parse(source);
  const keyId = need(env.RAZORPAY_KEY_ID, "RAZORPAY_KEY_ID");
  if (!/^rzp_(test|live)_[A-Za-z0-9]{6,40}$/.test(keyId)) {
    throw new Error("Invalid billing setting: RAZORPAY_KEY_ID");
  }
  const keySecret = need(env.RAZORPAY_KEY_SECRET, "RAZORPAY_KEY_SECRET");
  const webhookSecret = need(env.RAZORPAY_WEBHOOK_SECRET, "RAZORPAY_WEBHOOK_SECRET");
  if (webhookSecret.length < 16) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET must contain at least 16 characters");
  }
  const plans = {} as Record<BillableTier, string>;
  for (const tier of BILLABLE_TIERS) {
    const key = "RAZORPAY_PLAN_" + tier;
    const value = need(source[key], key);
    if (!/^plan_[A-Za-z0-9]{14}$/.test(value)) throw new Error("Invalid billing setting: " + key);
    plans[tier] = value;
  }
  // No default on purpose: the GST rate is OPEN until a tax adviser confirms it.
  const rawTax = need(env.BILLING_TAX_BASIS_POINTS, "BILLING_TAX_BASIS_POINTS");
  if (!/^\d{1,5}$/.test(rawTax) || Number(rawTax) > 10_000) {
    throw new Error("Invalid billing setting: BILLING_TAX_BASIS_POINTS");
  }
  return { keyId, keySecret, webhookSecret, plans, taxBasisPoints: Number(rawTax) };
}

/** Tax rate for display only; null when the operator has not configured it. Never throws. */
export function readTaxBasisPoints(source: Source = process.env): number | null {
  const raw = source.BILLING_TAX_BASIS_POINTS?.trim();
  if (!raw || !/^\d{1,5}$/.test(raw) || Number(raw) > 10_000) return null;
  return Number(raw);
}
