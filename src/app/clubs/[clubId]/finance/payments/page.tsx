import { Suspense } from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { recentClubPayments, receiptNumber } from "@/lib/finance-service";
import { formatMinorMoney } from "@/lib/money-format";
import { BusinessShell } from "@/components/clubs/business-shell";
import { ReversePaymentButton } from "@/components/clubs/reverse-payment-button";
import { idInput } from "@/lib/validations/onboarding";
export const metadata: Metadata = { title: "Payment ledger · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }>; searchParams: Promise<{ cursor?: string }> };
export default function Ledger(props: Props) {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-[#0b0705] p-9 text-white">Loading ledger…</main>}
    >
      <LedgerContent {...props} />
    </Suspense>
  );
}
async function LedgerContent({ params, searchParams }: Props) {
  const { clubId } = await params,
    { cursor } = await searchParams,
    session = await requireSession();
  await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { name: true },
  });
  const safeCursor = cursor && idInput.safeParse(cursor).success ? cursor : undefined;
  const rows = await recentClubPayments(prisma, clubId, safeCursor),
    page = rows.slice(0, 50);
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="finance"
      eyebrow="Immutable record"
      title="Every entry has a story."
      description="Review recorded cash, UPI, card and other offline collections. Corrections create a reversal and never erase the original receipt."
    >
      <section className="mt-8 overflow-hidden rounded-3xl border border-[#f6dc9b]/15 bg-[#19110b]">
        {page.length === 0 ? (
          <div className="p-10 text-center">
            <History className="mx-auto size-8 text-[#eab878]" />
            <p className="mt-4 font-semibold">Your payment ledger is empty</p>
            <p className="mt-2 text-sm text-[#bca28b]">
              Open a member profile to record a first collection.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f6dc9b]/10">
            {page.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <Link
                    href={"/clubs/" + clubId + "/finance/receipts/" + p.id}
                    className="font-semibold text-[#f6c58f] hover:underline"
                  >
                    {receiptNumber(p.receiptNo)}
                  </Link>
                  <p className="mt-1 text-sm">
                    {p.memberName} · {p.planName}
                  </p>
                  <p className="mt-1 text-xs text-[#b6a08b]">
                    {p.method} · {p.receivedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      p.reversal ? "text-[#a38e7b] line-through" : "font-semibold text-[#f9ce9a]"
                    }
                  >
                    {formatMinorMoney(p.amountMinor, p.currency)}
                  </span>
                  {p.reversal ? (
                    <span className="rounded-xl bg-[#44211d] px-3 py-2 text-xs text-[#f9b4a3]">
                      VOID
                    </span>
                  ) : (
                    <ReversePaymentButton clubId={clubId} paymentId={p.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {rows.length > 50 && page.at(-1) && (
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#f6dc9b]/20 px-4 text-sm text-[#f6bf86]"
          href={
            "/clubs/" + clubId + "/finance/payments?cursor=" + encodeURIComponent(page.at(-1)!.id)
          }
        >
          Next page <ArrowRight className="ml-2 size-4" />
        </Link>
      )}
    </BusinessShell>
  );
}
