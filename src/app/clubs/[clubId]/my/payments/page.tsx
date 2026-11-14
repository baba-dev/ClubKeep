import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { memberArenaSnapshot, memberPaymentPage } from "@/lib/member-projections";
import { idInput } from "@/lib/validations/onboarding";
import { formatMinorMoney } from "@/lib/money-format";
import { receiptNumber } from "@/lib/finance-service";
import { prisma } from "@/lib/prisma";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";

export const metadata: Metadata = {
  title: "My Club Payments · ClubKeep",
  robots: { index: false },
};

export default function MyPaymentsRoute(props: { params: Promise<{ clubId: string }>; searchParams: Promise<{ cursor?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0b0e] p-8 text-[#fce8d2]">Loading your club…</main>}>
      <MyPayments {...props} />
    </Suspense>
  );
}

async function MyPayments({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { clubId } = await params;
  const { cursor } = await searchParams;
  if (cursor && !idInput.safeParse(cursor).success) notFound();
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const [payments, overview] = member
    ? await Promise.all([
        memberPaymentPage(prisma, clubId, member.id, cursor),
        memberArenaSnapshot(prisma, clubId, member.id),
      ])
    : [[], null];
  const page = payments.slice(0, 20);
  const next = payments.length > 20 ? page.at(-1)?.id : null;
  const dues = overview?.terms.filter((t) => !t.cancelledAt && t.dueMinor > 0) ?? [];
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="fees"
      eyebrow="Clear by design"
      title="Every payment, accounted for."
      summary="Review club fees recorded by reception, check remaining dues and open a private receipt. Your club handles payments outside ClubKeep."
    >
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[#e3a55d]/25 bg-gradient-to-br from-[#392317] to-[#17171a] p-7">
          <Wallet className="size-8 text-[#ffc47d]" />
          <h2 className="mt-5 text-2xl font-black">Your balance</h2>
          <p className="mt-3 text-sm leading-7 text-[#d2b7a4]">
            Outstanding fees from your latest membership terms, by currency.
          </p>
          {dues.length ? (
            <div className="mt-6 space-y-3">
              {dues.map((term) => (
                <div
                  key={term.id}
                  className="rounded-xl border border-[#ffe2b6]/15 bg-black/15 p-4"
                >
                  <p className="text-xs text-[#bfa893]">{term.planName}</p>
                  <p className="mt-1 text-lg font-extrabold text-[#ffd08f] tabular-nums">
                    {formatMinorMoney(term.dueMinor, term.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-[#e1c6ab]">
              No outstanding balance across the latest terms shown.
            </p>
          )}
          <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#b6a093]">
            <ShieldCheck className="mt-1 size-4 shrink-0" /> These amounts are club-recorded; not
            independently bank verified.
          </p>
        </aside>
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#19191e]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CreditCard className="size-5 text-[#ffc47d]" /> Payment record
            </h2>
            <span className="text-xs text-[#b5a398]">Private ledger</span>
          </div>
          {!member ? (
            <p className="p-8 text-sm text-[#c3b0a2]">
              Ask reception to link your verified account before seeing membership finance history.
            </p>
          ) : page.length === 0 ? (
            <p className="p-8 text-sm text-[#c3b0a2]">
              No payments have been recorded for you by this club.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {page.map((payment) => (
                <li key={payment.id}>
                  <Link
                    href={
                      "/clubs/" +
                      encodeURIComponent(clubId) +
                      "/my/receipts/" +
                      encodeURIComponent(payment.id)
                    }
                    className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-white/5 sm:px-7"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#332419] text-[#ffb56c]">
                        <ReceiptText className="size-5" />
                      </span>
                      <div>
                        <p className="font-bold text-[#f9e5d4]">
                          {receiptNumber(payment.receiptNo)}
                        </p>
                        <p className="mt-1 text-xs text-[#ad9a8b]">
                          {payment.planName} · {payment.receivedAt.toISOString().slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className={
                            "font-bold tabular-nums " +
                            (payment.reversal ? "text-[#eea59b] line-through" : "text-[#ffc47d]")
                          }
                        >
                          {formatMinorMoney(payment.amountMinor, payment.currency)}
                        </p>
                        <p className="mt-1 text-xs text-[#b29c8c]">
                          {payment.reversal ? "VOID / reversed" : payment.method + " · recorded"}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-[#caa17e]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {next && (
            <Link
              href={"?cursor=" + encodeURIComponent(next)}
              className="flex min-h-14 items-center justify-center gap-2 border-t border-white/10 text-sm font-semibold text-[#ffc17b] hover:bg-white/5"
            >
              Older records <ArrowRight className="size-4" />
            </Link>
          )}
        </section>
      </div>
    </MemberArenaShell>
  );
}
