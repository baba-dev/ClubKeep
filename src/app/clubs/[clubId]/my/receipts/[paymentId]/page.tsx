import Link from "next/link";
import { ArrowLeft, ReceiptText, ShieldCheck, AlertTriangle } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireLinkedMember } from "@/lib/member-self-service";
import { memberReceipt } from "@/lib/member-projections";
import { idInput } from "@/lib/validations/onboarding";
import { receiptNumber } from "@/lib/finance-service";
import { formatMinorMoney } from "@/lib/money-format";
import { prisma } from "@/lib/prisma";
import { PrintClubReceiptButton } from "@/components/clubs/print-club-receipt-button";

export const metadata: Metadata = { title: "My Club Receipt · ClubKeep", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MemberReceiptPage({
  params,
}: {
  params: Promise<{ clubId: string; paymentId: string }>;
}) {
  const { clubId, paymentId } = await params;
  if (!idInput.safeParse(clubId).success || !idInput.safeParse(paymentId).success) notFound();
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await requireLinkedMember(prisma, session.user.id, clubId);
  const receipt = await memberReceipt(prisma, clubId, member.id, paymentId);
  if (!receipt) notFound();
  const voided = Boolean(receipt.reversal);
  return (
    <main className="min-h-screen bg-[#0d0c0e] p-4 text-[#fbeada] sm:p-9 print:bg-white print:p-0 print:text-black">
      <div className="mx-auto max-w-[760px]">
        <nav
          className="mb-7 flex items-center justify-between gap-4 print:hidden"
          aria-label="Receipt actions"
        >
          <Link
            href={"/clubs/" + encodeURIComponent(clubId) + "/my/payments"}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#f7bc78]"
          >
            <ArrowLeft className="size-4" /> My payments
          </Link>
          <PrintClubReceiptButton />
        </nav>
        <article className="overflow-hidden rounded-3xl border border-[#f6d4a2]/25 bg-[#fffaf2] text-[#302014] shadow-2xl print:rounded-none print:border-0 print:shadow-none">
          <header className="bg-gradient-to-r from-[#3b2315] to-[#17141b] p-7 text-white sm:p-10 print:bg-white print:text-black">
            <span className="flex items-center gap-2 text-xs font-black tracking-[.2em] text-[#ffd49e] uppercase print:text-black">
              <ReceiptText className="size-5" /> ClubKeep / Recorded receipt
            </span>
            <h1 className="mt-4 text-3xl font-black">{receipt.clubName}</h1>
            <p className="mt-2 text-xs text-[#dfc4ab] print:text-black">
              External club membership-fee record
            </p>
          </header>
          <div className="p-7 sm:p-10">
            <div className="flex flex-wrap justify-between gap-4 border-b border-[#e3cfb5] pb-7">
              <div>
                <p className="text-xs font-bold tracking-widest text-[#8a6b52] uppercase">
                  Receipt number
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums">
                  {receiptNumber(receipt.receiptNo)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-bold tracking-widest text-[#8a6b52] uppercase">Status</p>
                <p
                  className={
                    "mt-2 font-extrabold " + (voided ? "text-[#a74239]" : "text-[#317653]")
                  }
                >
                  {voided ? "VOID / REVERSED" : "RECORDED"}
                </p>
              </div>
            </div>
            <dl className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[#81674f]">Member</dt>
                <dd className="mt-2 font-bold">
                  {receipt.memberName} · #{receipt.memberNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#81674f]">Club</dt>
                <dd className="mt-2 font-bold">{club.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#81674f]">Membership</dt>
                <dd className="mt-2 font-bold">{receipt.planName}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#81674f]">Received on (UTC)</dt>
                <dd className="mt-2 font-bold">
                  {receipt.receivedAt.toISOString().slice(0, 16).replace("T", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#81674f]">Term</dt>
                <dd className="mt-2 text-sm">
                  {receipt.termStartsAt.toISOString().slice(0, 10)} to{" "}
                  {receipt.termEndsAt.toISOString().slice(0, 10)} (end exclusive)
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#81674f]">Recorded method</dt>
                <dd className="mt-2 font-bold">{receipt.method}</dd>
              </div>
            </dl>
            <div className="mt-8 rounded-2xl border border-[#e4cdb1] bg-white p-6">
              <p className="text-xs text-[#85664c]">This recorded collection</p>
              <p
                className={
                  "mt-2 text-4xl font-black tabular-nums " +
                  (voided ? "text-[#9d534c] line-through" : "text-[#9e4e17]")
                }
              >
                {formatMinorMoney(receipt.amountMinor, receipt.currency)}
              </p>
            </div>
            {voided && (
              <p className="mt-6 flex gap-2 rounded-xl bg-[#fff0eb] p-4 text-sm font-semibold text-[#9d4c41]">
                <AlertTriangle className="size-5 shrink-0" /> This recorded payment has been
                reversed and no longer reduces your outstanding club dues.
              </p>
            )}
            <p className="mt-8 flex gap-3 border-t border-[#e0cab3] pt-6 text-xs leading-6 text-[#81654f]">
              <ShieldCheck className="mt-1 size-5 shrink-0" /> This receipt only reflects payment
              entered by club staff as externally received. It is not confirmation of bank
              settlement, an online-payment receipt or a statutory tax invoice.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
