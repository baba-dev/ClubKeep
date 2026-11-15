import { Suspense } from "react";
import Link from "next/link";
import {
  WalletCards,
  Coins,
  CalendarClock,
  ReceiptText,
  ArrowUpRight,
  History,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import {
  clubFinanceSummary,
  recentClubPayments,
  financeMonthlyTrend,
  receiptNumber,
} from "@/lib/finance-service";
import { formatMinorMoney } from "@/lib/money-format";
import { BusinessShell } from "@/components/clubs/business-shell";
import { CollectionsTrend } from "@/components/human-motion/collections-trend";
import { OperationsBanner, OperationsSafetyNote } from "@/components/human-motion/operations-ui";

export const metadata: Metadata = { title: "Club finance · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }> };
export default function ClubFinance(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-9 text-[#f8e6d2]">Loading club finances…</main>
      }
    >
      <FinanceContent {...props} />
    </Suspense>
  );
}
async function FinanceContent({ params }: Props) {
  const { clubId } = await params,
    session = await requireSession();
  await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { name: true, timeZone: true },
  });
  const [totals, recent, trend] = await Promise.all([
    clubFinanceSummary(prisma, clubId),
    recentClubPayments(prisma, clubId),
    financeMonthlyTrend(prisma, clubId, club.timeZone),
  ]);
  const base = "/clubs/" + encodeURIComponent(clubId) + "/finance";
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="finance"
      eyebrow="Your club's money story"
      title="Finance, without the guesswork."
      description="Track fees received outside ClubKeep, understand outstanding memberships, and issue clear receipts. No payments are processed by ClubKeep."
    >
      <OperationsBanner eyebrow="Clarity in every currency" title="A calmer view of every collection." description="Real net receipts, upcoming dues and histories kept separate by currency." art="landscape" compact />
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={base + "/dues"}
          className="hm-button hm-button-primary"
        >
          <CalendarClock className="size-4" />
          View outstanding dues
        </Link>
        <Link
          href={base + "/payments"}
          className="hm-button hm-button-secondary"
        >
          <History className="size-4" />
          All recorded payments
        </Link>
      </div>
      <div className="mt-8 space-y-6">
        {totals.length === 0 ? (
          <section className="hm-ops-empty text-center">
            <WalletCards className="mx-auto size-10 text-[#eebf7e]" />
            <h2 className="mt-4 text-2xl font-semibold">A clearer picture starts here</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#bea48c]">
              Create a membership plan and assign your first member. Record externally received fees
              from the member profile.
            </p>
            <Link
              href={"/clubs/" + clubId + "/members"}
              className="mt-5 inline-flex items-center gap-2 text-sm text-[#f8c38c] underline underline-offset-4"
            >
              Go to members <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          totals.map((entry) => (
            <section
              key={entry.currency}
              className="hm-ops-section"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[.2em] text-[#e7b779] uppercase">
                    {entry.currency} · Club finances
                  </p>
                  <h2 className="hm-section-title mt-2">
                    {entry.terms} active or scheduled membership terms
                  </h2>
                </div>
                <span className="hm-ops-pill">
                  Currency totals kept separate
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { icon: Coins, label: "Expected term fees", value: entry.charged },
                  { icon: WalletCards, label: "Recorded net collections", value: entry.collected },
                  { icon: ReceiptText, label: "Outstanding dues", value: entry.outstanding },
                  { icon: CalendarClock, label: "Overdue at term expiry", value: entry.overdue },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="hm-ops-stat"
                  >
                    <Icon className="size-5 text-[var(--hm-sage-deep)]" />
                    <p className="hm-ops-stat-value break-all">
                      {formatMinorMoney(value, entry.currency)}
                    </p>
                    <p className="hm-ops-stat-label">{label}</p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
        <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <section className="hm-ops-section">
            <h2 className="text-xl font-semibold">Collections over time</h2>
            <p className="mt-2 text-xs text-[#b9a18e]">
              Monthly externally recorded net collections, local club time
            </p>
            {trend.length === 0 ? (
              <p className="hm-small mt-6">Once your first fee is recorded, verified monthly totals will appear here.</p>
            ) : (
              <CollectionsTrend entries={trend} />
            )}
          </section>
          <section className="rounded-3xl border border-[#f6dc9b]/15 bg-[#19110b] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Recent entries</h2>
              <Link href={base + "/payments"} className="text-sm text-[#f6c38b]">
                View all <ArrowUpRight className="inline size-4" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-6 text-sm text-[#bba38f]">
                No club payments have been recorded yet.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--hm-line)]">
                {recent.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0">
                      <Link
                        href={base + "/receipts/" + encodeURIComponent(p.id)}
                        className="font-semibold text-[var(--hm-terracotta)] hover:underline"
                      >
                        {receiptNumber(p.receiptNo)}
                      </Link>
                      <span className="mt-1 block truncate text-xs text-[#b7a08d]">
                        {p.memberName} · {p.method}
                      </span>
                    </span>
                    <span
                      className={
                        p.reversal ? "text-[#aa9585] line-through" : "font-semibold text-[#f7d0a1]"
                      }
                    >
                      {formatMinorMoney(p.amountMinor, p.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <p className="hm-small">
          Financial records are owner/staff-entered attestations only. A canceled term has no
          actionable dues; voided payments remain in the audit ledger. Statutory tax invoicing and
          payment gateway verification are not provided.
        </p>
      </div>
    </BusinessShell>
  );
}
