import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubRole } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import { billingSummary } from "@/lib/billing/summary";
import { BILLABLE_TIERS } from "@/lib/billing/policy";
import { PLAN_COPY, type SubscribeBlock } from "@/lib/billing/view";
import { formatMinorMoney } from "@/lib/money-format";
import { BusinessShell } from "@/components/clubs/business-shell";
import { CancelPlanButton, SubscribeButton } from "@/components/clubs/billing-actions";
import { OperationsSafetyNote } from "@/components/human-motion/operations-ui";

export const metadata: Metadata = { title: "Plan & billing · ClubKeep", robots: { index: false } };

export default function ClubBilling({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen p-8">Loading your plan…</main>}>
      <ClubBillingContent params={params} />
    </Suspense>
  );
}

const BLOCK_COPY: Record<Exclude<SubscribeBlock, null | "HAS_PLAN">, string> = {
  BILLING_OFF: "Paid plans are not open yet. Your club keeps working on its current plan.",
  NO_COUNTRY: "Set your club's country in club settings to see prices and subscribe.",
  COUNTRY_UNSUPPORTED:
    "Paid plans are not available in your country yet. Your club keeps working on its current plan.",
};

async function ClubBillingContent({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  try {
    await requireClubRole(prisma, session.user.id, clubId, ["OWNER"]);
  } catch {
    notFound();
  }
  const s = await billingSummary(prisma, clubId);
  const base = "/clubs/" + encodeURIComponent(clubId);
  const date = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat("en-IN", {
          timeZone: s.timeZone,
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(value)
      : "";
  const { view } = s;
  const over = s.seatLimit !== null && s.seatsUsed > s.seatLimit;
  const pct = s.seatLimit ? Math.min(100, Math.round((s.seatsUsed / s.seatLimit) * 100)) : 0;
  const blockMessage =
    view.subscribeBlock && view.subscribeBlock !== "HAS_PLAN"
      ? BLOCK_COPY[view.subscribeBlock]
      : null;
  const money = (minor: number) => (s.currency ? formatMinorMoney(minor, s.currency) : "");

  return (
    <BusinessShell
      clubId={clubId}
      clubName={s.clubName}
      active="settings"
      eyebrow="Plan & billing"
      title="Your plan, in plain sight."
      description="See what your club can do today, how close you are to the limit, and change plans when you grow."
    >
      <div className="mt-6 space-y-5">
        {view.mode === "PAST_DUE" && (
          <section
            role="alert"
            className="hm-ops-section mt-0"
            style={{ borderColor: "var(--hm-terracotta)" }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-1 size-5 shrink-0"
                style={{ color: "var(--hm-terracotta)" }}
                aria-hidden="true"
              />
              <div>
                <h2 className="hm-section-title">
                  {view.graceExpired
                    ? "Your plan is paused: payment overdue"
                    : "Your last payment did not go through"}
                </h2>
                <p className="hm-small mt-2">
                  {view.graceExpired
                    ? `The ${view.graceDays}-day grace period ended on ${date(view.graceEndsAt)}. Your club is on the Free limit until payment succeeds. Nothing has been deleted.`
                    : `Your plan stays fully active until ${date(view.graceEndsAt)} while payment is retried. Update your payment method using the link in your payment provider's email, or ask them to retry.`}
                </p>
              </div>
            </div>
          </section>
        )}
        {view.mode === "PENDING" && (
          <section className="hm-ops-section mt-0">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-1 size-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="hm-section-title">Checkout started</h2>
                <p className="hm-small mt-2">
                  If you completed payment, your plan activates within a minute or two; refresh this
                  page. Otherwise choose a plan below to start again.
                </p>
              </div>
            </div>
          </section>
        )}
        {blockMessage && (
          <p className="hm-ops-safety" role="note">
            {blockMessage}{" "}
            {view.subscribeBlock === "NO_COUNTRY" && (
              <Link href={base + "/settings"} className="underline underline-offset-4">
                Open club settings
              </Link>
            )}
          </p>
        )}

        <section className="hm-ops-section mt-0" aria-labelledby="current-plan">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="hm-kicker hm-page-eyebrow">Current plan</p>
              <h2 id="current-plan" className="hm-display mt-1 text-3xl">
                {PLAN_COPY[s.tier].name}
              </h2>
            </div>
            <span className="hm-ops-pill">
              {view.mode === "ACTIVE" && "Active"}
              {view.mode === "CANCELING" && "Ends " + date(view.periodEnd)}
              {view.mode === "CANCELLED_PAID" && "Ends " + date(view.periodEnd)}
              {view.mode === "PAST_DUE" && (view.graceExpired ? "Paused" : "Payment retrying")}
              {view.mode === "PENDING" && "Checkout pending"}
              {view.mode === "FREE" && (s.tier === "FREE" ? "Free" : "Set by ClubKeep")}
            </span>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">Active members</p>
              <p className="hm-small">
                {s.seatsUsed.toLocaleString("en-IN")}
                {s.seatLimit !== null
                  ? ` of ${s.seatLimit.toLocaleString("en-IN")}`
                  : " (no limit)"}
              </p>
            </div>
            {s.seatLimit !== null && (
              <div
                role="progressbar"
                aria-label="Active members against your plan limit"
                aria-valuemin={0}
                aria-valuemax={s.seatLimit}
                aria-valuenow={Math.min(s.seatsUsed, s.seatLimit)}
                className="mt-2 h-2.5 overflow-hidden rounded-full"
                style={{ background: "var(--hm-line)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: pct + "%",
                    background: over || pct >= 90 ? "var(--hm-terracotta)" : "var(--hm-sage-deep)",
                  }}
                />
              </div>
            )}
            {over && (
              <p className="hm-small mt-2">
                You are over this plan&apos;s limit. Everyone stays; new members can&apos;t be added
                until you upgrade or archive inactive members.
              </p>
            )}
            {!over && s.seatLimit !== null && pct >= 90 && (
              <p className="hm-small mt-2">
                You are close to your limit. Upgrade to keep adding members.
              </p>
            )}
          </div>
          {(view.mode === "ACTIVE" || view.mode === "CANCELING") && (
            <div className="mt-5 space-y-3 border-t pt-5" style={{ borderColor: "var(--hm-line)" }}>
              <p className="hm-small flex items-center gap-2">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {view.mode === "CANCELING"
                  ? `Cancelled. Your plan stays active until ${date(view.periodEnd)}.`
                  : view.periodEnd
                    ? `Renews on ${date(view.periodEnd)}.`
                    : "Renews monthly."}
                {s.subscription &&
                  ` ${formatMinorMoney(s.subscription.chargeAmountMinor, s.subscription.currency)} a month including tax.`}
              </p>
              {view.mode === "ACTIVE" && (
                <CancelPlanButton
                  clubId={clubId}
                  endsLabel={date(view.periodEnd) || "the end of the period"}
                />
              )}
            </div>
          )}
          {view.mode === "PAST_DUE" && (
            <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--hm-line)" }}>
              <CancelPlanButton clubId={clubId} endsLabel="today" />
            </div>
          )}
        </section>

        {view.subscribeBlock !== "HAS_PLAN" && (
          <section aria-labelledby="plans-h">
            <h2 id="plans-h" className="hm-section-title">
              Choose a plan
            </h2>
            <p className="hm-small mt-2">
              Monthly billing
              {s.taxBasisPoints === null
                ? ", plus applicable tax"
                : ", tax included in the total shown"}
              . Cancel any time; your plan runs to the end of the period you paid for.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {BILLABLE_TIERS.map((t) => {
                const copy = PLAN_COPY[t];
                const price = s.prices.find((p) => p.tier === t);
                const current = s.tier === t;
                return (
                  <article key={t} className="hm-ops-plan-card" aria-label={copy.name + " plan"}>
                    <h3 className="hm-display text-2xl">{copy.name}</h3>
                    <p className="hm-ops-plan-price mt-2">
                      {price ? money(price.listMinor) : "—"}
                      <span className="hm-small"> / month{price ? " + tax" : ""}</span>
                    </p>
                    {price?.totalMinor != null && (
                      <p className="hm-small">{money(price.totalMinor)} charged including tax</p>
                    )}
                    <p className="mt-3 text-sm font-semibold">{copy.members}</p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {copy.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    {copy.soon.length > 0 && (
                      <p className="hm-small mt-3">Coming soon: {copy.soon.join(", ")}</p>
                    )}
                    <div className="mt-5">
                      <SubscribeButton
                        clubId={clubId}
                        tier={t}
                        label={current ? "Your current plan" : "Choose " + copy.name}
                        disabled={view.subscribeBlock !== null || current}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {view.subscribeBlock === "HAS_PLAN" && (
          <p className="hm-small">
            To change plans, cancel your current plan and subscribe again when it ends. Plan changes
            while a plan is running are not available yet.
          </p>
        )}
      </div>
      <OperationsSafetyNote>
        <ShieldCheck className="mr-1 inline size-4" aria-hidden="true" />
        Payments are taken on your payment provider&apos;s secure page; ClubKeep never sees your
        card details. ClubKeep does not process the fees your members pay your club.
      </OperationsSafetyNote>
    </BusinessShell>
  );
}
