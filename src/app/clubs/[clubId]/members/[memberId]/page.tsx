import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Clock4, History, ShieldCheck, UserRound } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { statusForTerm } from "@/lib/membership-dates";
import { formatMinorMoney } from "@/lib/money-format";
import { BusinessShell } from "@/components/clubs/business-shell";
import { memberClubFinance } from "@/lib/finance-service";
import { RecordClubPaymentForm } from "@/components/clubs/record-club-payment-form";
import { ReceiptText } from "lucide-react";
import { MemberActions } from "@/components/clubs/member-actions";
import { CancelTermButton } from "@/components/clubs/cancel-term-button";
import { ScoreSubmitForm } from "@/components/clubs/score-submit-form";
import { Trophy } from "lucide-react";

export const metadata: Metadata = { title: "Member profile · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string; memberId: string }> };
export default function MemberPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">
          Loading member details…
        </main>
      }
    >
      <MemberContent {...props} />
    </Suspense>
  );
}
async function MemberContent({ params }: Props) {
  const { clubId, memberId } = await params,
    session = await requireSession();
  const access = await requireClubActive(prisma, session.user.id, clubId, [
    "OWNER",
    "MANAGER",
    "STAFF",
  ]);
  const [club, member, plans, candidates] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } }),
    prisma.clubMemberRecord.findFirst({
      where: { clubId, id: memberId },
      include: {
        contacts: { where: { source: "OWNER_ENTERED" }, take: 1, select: { phoneE164: true } },
        membership: { select: { user: { select: { name: true } } } },
        subscriptions: { orderBy: { endAt: "desc" }, take: 80 },
        events: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, eventType: true, createdAt: true, actor: { select: { name: true } } },
        },
      },
    }),
    prisma.clubPlan.findMany({
      where: { clubId, archivedAt: null },
      select: {
        id: true,
        name: true,
        durationUnit: true,
        durationCount: true,
        currency: true,
        priceMinor: true,
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.clubMembership.findMany({
      where: { clubId, role: "MEMBER", status: "ACTIVE", memberRecord: { is: null } },
      select: { id: true, user: { select: { name: true } } },
      take: 100,
    }),
  ]);
  if (!member) notFound();
  const nowCompetition = new Date();
  const activeCompetition = await prisma.clubSeason.findFirst({
    where: { clubId, startAt: { lte: nowCompetition }, endAt: { gt: nowCompetition } },
    select: { metrics: { select: { id: true, metric: true } } },
  });
  const financialTerms = await memberClubFinance(prisma, clubId, member.id);
  const recentVisits = await prisma.clubAttendance.findMany({
    where: { clubId, memberRecordId: member.id },
    select: { id: true, localDate: true, method: true },
    orderBy: { checkedInAt: "desc" },
    take: 4,
  });
  const activeTerm =
    member.subscriptions.find((term) => !term.cancelledAt && term.endAt > new Date()) ?? null;
  const lastTerm = member.subscriptions.find((term) => !term.cancelledAt) ?? null;
  const status = member.status === "ARCHIVED" ? "ARCHIVED" : statusForTerm(lastTerm);
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="members"
      eyebrow="Member profile"
      title={member.displayName}
      description={`Member #${String(member.memberNumber).padStart(4, "0")} · Private club record. This profile never grants access to Personal health information.`}
    >
      <Link
        href={`/clubs/${clubId}/members`}
        className="mt-7 inline-flex items-center gap-2 text-sm text-[#f1c388] underline underline-offset-4"
      >
        <ArrowLeft className="size-4" />
        All members
      </Link>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="rounded-3xl border border-[#f6dc9b]/20 bg-gradient-to-br from-[#2b1b11] to-[#130e09] p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#f26b00]/20">
              <UserRound className="size-7 text-[#ffc381]" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">{member.displayName}</h2>
              <p className="mt-1 text-sm text-[#bea48d]">
                {member.membership ? "Verified club account linked" : "Walk-in member record"}
              </p>
            </div>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-5 text-sm">
            <div>
              <dt className="text-[#a88e75]">Membership status</dt>
              <dd className="mt-2 font-semibold text-[#ffcc89]">{status.toLowerCase()}</dd>
            </div>
            <div>
              <dt className="text-[#a88e75]">Member number</dt>
              <dd className="mt-2 font-semibold">
                #{String(member.memberNumber).padStart(4, "0")}
              </dd>
            </div>
            <div>
              <dt className="text-[#a88e75]">Contact</dt>
              <dd className="mt-2 font-semibold break-words">
                {member.contacts[0]?.phoneE164 || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-[#a88e75]">Club join date</dt>
              <dd className="mt-2 font-semibold">{member.joinedAt.toISOString().slice(0, 10)}</dd>
            </div>
          </dl>
          <p className="mt-8 flex items-start gap-2 border-t border-[#f6dc9b]/10 pt-5 text-xs leading-6 text-[#bba089]">
            <ShieldCheck className="mt-1 size-4 shrink-0 text-[#dda85d]" />
            Contacts are unverified and not used to create, recover or merge identities.
          </p>
        </section>
        <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#19110d] p-6 sm:p-8">
          <CalendarDays className="size-6 text-[#ffb56e]" />
          <p className="mt-4 text-xs tracking-widest text-[#dcb67c] uppercase">Latest membership</p>
          {lastTerm ? (
            <>
              <h2 className="mt-3 text-2xl font-semibold">{lastTerm.planName}</h2>
              <p className="mt-2 text-3xl font-semibold text-[#f9c376]">
                {formatMinorMoney(lastTerm.priceMinor, lastTerm.currency)}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#a9907a]">Starts</p>
                  <p className="mt-2 font-semibold">
                    {lastTerm.startAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div>
                  <p className="text-[#a9907a]">Valid until (exclusive)</p>
                  <p className="mt-2 font-semibold">{lastTerm.endAt.toISOString().slice(0, 10)}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-2xl font-semibold">No plan assigned yet</h2>
              <p className="mt-3 text-sm leading-6 text-[#baa18b]">
                Choose a plan below to begin this member’s access. Payment recording is a separate
                feature.
              </p>
            </>
          )}
        </section>
      </div>
      <MemberActions
        clubId={clubId}
        memberId={member.id}
        memberName={member.displayName}
        phoneE164={member.contacts[0]?.phoneE164 ?? ""}
        canManage={true}
        canElevate={access.role === "OWNER" || access.role === "MANAGER"}
        archived={member.status === "ARCHIVED"}
        hasCurrent={Boolean(activeTerm)}
        linked={Boolean(member.membershipId)}
        plans={plans}
        candidates={candidates.map((candidate) => ({
          id: candidate.id,
          name: candidate.user.name,
        }))}
      />
      {member.status === "ACTIVE" && activeCompetition?.metrics.length ? (
        <section className="mt-7 rounded-3xl border border-[#f6dc9b]/15 bg-[#19110d] p-6 sm:p-8">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
            <Trophy className="size-6 text-[#ffc07a]" /> Propose verified performance
          </h2>
          <p className="mb-5 max-w-xl text-sm leading-7 text-[#bba18b]">
            Only enter a witnessed result. A separate owner or manager must independently approve
            it; a submitter cannot approve their own score.
          </p>
          <ScoreSubmitForm
            clubId={clubId}
            metrics={activeCompetition.metrics}
            memberRecordId={member.id}
          />
        </section>
      ) : null}
      <RecordClubPaymentForm
        clubId={clubId}
        memberId={member.id}
        terms={financialTerms
          .filter((t) => !t.cancelledAt && t.dueMinor > 0)
          .map((t) => ({
            id: t.id,
            planName: t.planName,
            currency: t.currency,
            dueMinor: t.dueMinor,
          }))}
      />
      <section className="mt-7 rounded-3xl border border-[#f6dc9b]/15 bg-[#19110d] p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ReceiptText className="size-5 text-[#efb96e]" /> Membership dues & receipts
        </h2>
        {financialTerms.length === 0 ? (
          <p className="mt-4 text-sm text-[#bda48d]">No membership term or fee history yet.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {financialTerms.slice(0, 10).map((term) => (
              <div
                key={term.id}
                className="rounded-2xl border border-[#f6dc9b]/10 bg-[#261910] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{term.planName}</p>
                    <p className="mt-1 text-xs text-[#ae9780]">
                      {term.cancelledAt ? "Canceled term" : "Membership term"} · {term.currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#f3bd7b]">
                      {formatMinorMoney(term.dueMinor, term.currency)} due
                    </p>
                    <p className="mt-1 text-xs text-[#baa28a]">
                      {formatMinorMoney(term.paidMinor, term.currency)} recorded paid
                    </p>
                  </div>
                </div>
                {term.payments.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f6dc9b]/10 pt-3 text-xs"
                  >
                    <span className={p.reversal ? "text-[#aa917d] line-through" : "text-[#d3b99f]"}>
                      {formatMinorMoney(p.amountMinor, term.currency)} · {p.method}{" "}
                      {p.reversal ? "· VOID" : ""}
                    </span>
                    <Link
                      className="text-[#f2bd7a] underline underline-offset-4"
                      href={"/clubs/" + clubId + "/finance/receipts/" + p.id}
                    >
                      Receipt #{p.receiptNo}
                    </Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mt-7 rounded-3xl border border-[#f6dc9b]/15 bg-[#1d140e] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5 text-[#f3b86a]" />
            Recent check-ins
          </h2>
          <Link
            href={`/clubs/${clubId}/attendance/history?memberId=${member.id}`}
            className="text-xs font-semibold text-[#f5c489] hover:underline"
          >
            Full attendance history →
          </Link>
        </div>
        {recentVisits.length === 0 ? (
          <p className="mt-4 text-sm text-[#b8a08c]">
            No check-ins recorded yet. Scan the member’s live QR or check them in from reception.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {recentVisits.map((visit) => (
              <li
                key={visit.id}
                className="rounded-2xl border border-[#f6dc9b]/10 bg-[#281a10] px-4 py-3"
              >
                <p className="font-semibold">{visit.localDate}</p>
                <p className="mt-1 text-xs text-[#b6a087]">
                  {visit.method === "QR" ? "QR scan" : "Manual reception entry"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-7 grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock4 className="size-5 text-[#f3b86a]" />
            Membership history
          </h2>
          {member.subscriptions.length === 0 ? (
            <p className="mt-5 text-sm text-[#b8a08c]">No membership terms yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {member.subscriptions.map((term) => (
                <div
                  key={term.id}
                  className="rounded-2xl border border-[#f6dc9b]/10 bg-[#261910] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{term.planName}</p>
                      <p className="mt-1 text-xs text-[#a9907a]">
                        {term.startAt.toISOString().slice(0, 10)} —{" "}
                        {term.endAt.toISOString().slice(0, 10)} (exclusive)
                      </p>
                      <p className="mt-2 text-sm text-[#f7c681]">
                        {formatMinorMoney(term.priceMinor, term.currency)} ·{" "}
                        {term.cancelledAt ? "Cancelled" : "Recorded"}
                      </p>
                    </div>
                    {!term.cancelledAt && access.role !== "STAFF" && (
                      <CancelTermButton
                        clubId={clubId}
                        memberId={member.id}
                        subscriptionId={term.id}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <History className="size-5 text-[#f3b86a]" />
            Activity timeline
          </h2>
          {member.events.length === 0 ? (
            <p className="mt-5 text-sm text-[#b8a08c]">No actions recorded yet.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {member.events.map((event) => (
                <li key={event.id} className="border-l-2 border-[#c38e48]/40 py-1 pl-4">
                  <p className="text-sm font-semibold">
                    {event.eventType.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className="mt-1 text-xs text-[#aa927b]">
                    {event.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC ·{" "}
                    {event.actor.name}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </BusinessShell>
  );
}
