import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { clubDuesPage } from "@/lib/finance-service";
import { formatMinorMoney } from "@/lib/money-format";
import { BusinessShell } from "@/components/clubs/business-shell";
import { idInput } from "@/lib/validations/onboarding";
export const metadata: Metadata = {
  title: "Outstanding membership dues · ClubKeep",
  robots: { index: false },
};
type Props = { params: Promise<{ clubId: string }>; searchParams: Promise<{ cursor?: string }> };
export default function Dues(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--hm-surface)] p-9 text-white">Loading dues…</main>
      }
    >
      <DuesContent {...props} />
    </Suspense>
  );
}
async function DuesContent({ params, searchParams }: Props) {
  const { clubId } = await params,
    { cursor } = await searchParams,
    session = await requireSession();
  await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { name: true },
  });
  const safeCursor = cursor && idInput.safeParse(cursor).success ? cursor : undefined;
  const records = await clubDuesPage(prisma, clubId, safeCursor),
    page = records.slice(0, 50);
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="finance"
      eyebrow="Follow up with care"
      title="Outstanding membership dues."
      description="Expected fees minus nonvoided recorded collections, one membership term at a time. Cancelled terms are excluded."
    >
      <div className="mt-7 overflow-hidden rounded-3xl border border-[var(--hm-line)]/15 bg-[var(--hm-surface)]">
        {page.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarClock className="mx-auto size-9 text-[var(--hm-terracotta)]" />
            <p className="mt-4 font-semibold">No outstanding dues on this page</p>
            <p className="mt-2 text-sm text-[var(--hm-muted)]">
              You are all caught up, or there are no memberships assigned.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f6dc9b]/10">
            {page.map((r) => (
              <Link
                key={r.id}
                href={"/clubs/" + clubId + "/members/" + r.memberRecordId}
                className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-[var(--hm-raised)]"
              >
                <div>
                  <p className="font-semibold">
                    {r.memberName}{" "}
                    <span className="text-xs text-[var(--hm-muted)]">#{r.memberNumber}</span>
                  </p>
                  <p className="mt-2 text-xs text-[var(--hm-muted)]">
                    {r.planName} · Expires {r.endAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-right">
                    <span className="block font-semibold text-[var(--hm-terracotta)]">
                      {formatMinorMoney(r.dueMinor, r.currency)}
                    </span>
                    <span className="block text-xs text-[var(--hm-muted)]">Remaining</span>
                  </span>
                  <ArrowRight className="size-4 text-[var(--hm-muted)]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {records.length > 50 && page.at(-1) && (
        <Link
          className="mt-5 inline-flex rounded-xl border border-[var(--hm-line)]/20 px-5 py-3 text-sm text-[var(--hm-terracotta)]"
          href={"/clubs/" + clubId + "/finance/dues?cursor=" + encodeURIComponent(page.at(-1)!.id)}
        >
          Next page <ArrowRight className="ml-2 size-4" />
        </Link>
      )}
      <p className="mt-6 text-xs text-[var(--hm-muted)]">
        Open a member to record an externally received payment. Financial figures are not
        bank-verified.
      </p>
    </BusinessShell>
  );
}
