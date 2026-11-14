import Link from "next/link";
import { ArrowUpRight, BellRing, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { memberArenaSnapshot } from "@/lib/member-projections";
import { renewalStatusLabel } from "@/lib/renewal-request-service";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";
import { RenewalRequestForm } from "@/components/clubs/renewal-request-form";

export const metadata: Metadata = {
  title: "Membership Renewal · ClubKeep",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function MemberRenewal({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const [requests, overview] = member
    ? await Promise.all([
        prisma.memberRenewalRequest.findMany({
          where: { clubId, memberRecordId: member.id, requestedByUserId: session.user.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 12,
          select: { id: true, status: true, createdAt: true },
        }),
        memberArenaSnapshot(prisma, clubId, member.id),
      ])
    : [[], null];
  const pending = requests.some((request) => request.status === "PENDING");
  const activeTerm =
    overview?.terms.find((t) => !t.cancelledAt && t.endAt > new Date()) ?? overview?.terms[0];
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="renewal"
      eyebrow="Stay in the game"
      title="Keep your streak alive."
      summary="Need a new term? Send reception a renewal request. Your club will review it—no charge or plan extension happens here."
    >
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-[#f5b46c]/25 bg-gradient-to-br from-[#302016] to-[#17171c] p-7 sm:p-9">
          <CalendarClock className="size-9 text-[#f9ba75]" />
          <h2 className="mt-5 text-2xl font-black">Your next chapter</h2>
          {member ? (
            <>
              <p className="mt-3 text-sm leading-7 text-[#d0b5a3]">
                {activeTerm
                  ? activeTerm.planName +
                    " · ends " +
                    activeTerm.endAt.toISOString().slice(0, 10) +
                    " (exclusive)."
                  : "No membership plan has been assigned yet."}
              </p>
              {pending ? (
                <p className="mt-6 flex gap-3 rounded-xl border border-[#ffc17c]/30 bg-[#523219]/30 p-4 text-sm text-[#ffcb93]">
                  <BellRing className="size-5 shrink-0" /> Your request is with reception. You&apos;ll
                  see its reviewed status here.
                </p>
              ) : (
                <RenewalRequestForm clubId={clubId} />
              )}
            </>
          ) : (
            <p className="mt-4 text-sm leading-7 text-[#d0b5a3]">
              Ask reception to link your account before you can send a member renewal request.
            </p>
          )}
          <p className="mt-7 flex items-start gap-2 text-xs leading-6 text-[#b9a398]">
            <ShieldCheck className="mt-1 size-4 shrink-0" /> This form does not process payments or
            renew a subscription automatically.
          </p>
        </section>
        <aside className="rounded-3xl border border-white/10 bg-[#19191e] p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CheckCircle2 className="size-5 text-[#ffc47f]" /> Your requests
          </h2>
          {requests.length ? (
            <ul className="mt-5 space-y-3">
              {requests.map((request) => (
                <li key={request.id} className="rounded-xl border border-white/10 bg-[#252026] p-4">
                  <p className="text-sm font-semibold text-[#ffe3c3]">
                    {renewalStatusLabel(request.status)}
                  </p>
                  <p className="mt-2 text-xs text-[#bca99a]">
                    {request.createdAt.toISOString().slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm leading-7 text-[#baa99a]">
              You haven&apos;t submitted a renewal request yet.
            </p>
          )}
          <Link
            href={"/clubs/" + encodeURIComponent(clubId) + "/my"}
            className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ffc27d]"
          >
            Back to my arena <ArrowUpRight className="size-4" />
          </Link>
        </aside>
      </div>
    </MemberArenaShell>
  );
}
