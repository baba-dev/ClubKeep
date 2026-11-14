import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { idInput } from "@/lib/validations/onboarding";
import { ArrowUpRight, BellRing, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { RenewalDecisionButtons } from "@/components/clubs/renewal-decision-buttons";


type Props = { params: Promise<{ clubId: string }>; searchParams: Promise<{ cursor?: string }> };

export default function RenewalRequestQueueRoute(props: Props) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0b0e] p-8 text-[#fce8d2]">Loading your club…</main>}>
      <RenewalRequestQueue {...props} />
    </Suspense>
  );
}

async function RenewalRequestQueue({ params, searchParams }: Props) {
  const { clubId } = await params;
  const { cursor } = await searchParams;
  if (cursor && !idInput.safeParse(cursor).success) notFound();
  const session = await requireSession();
  await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
  if (cursor) {
    const ownsCursor = await prisma.memberRenewalRequest.findFirst({
      where: { id: cursor, clubId, status: "PENDING" },
      select: { id: true },
    });
    if (!ownsCursor) notFound();
  }
  const [club, requests] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } }),
    prisma.memberRenewalRequest.findMany({
      where: { clubId, status: "PENDING" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        message: true,
        createdAt: true,
        memberRecordId: true,
        member: { select: { displayName: true, memberNumber: true } },
      },
    }),
  ]);
  const page = requests.slice(0, 50);
  const next = requests.length > 50 ? page.at(-1)?.id : null;
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="renewals"
      eyebrow="Members first"
      title="Renewal request inbox"
      description="Review requests from your verified linked members. Only the existing B1 member renewal flow can extend a term."
    >
      <div className="mt-8 overflow-hidden rounded-3xl border border-[#f6c78c]/20 bg-[#19110d]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f6dc9b]/15 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BellRing className="size-5 text-[#ffc178]" /> Pending requests
          </h2>
          <span className="text-xs text-[#c5aa92]">{page.length} displayed · up to 50</span>
        </div>
        {page.length === 0 ? (
          <p className="p-9 text-sm text-[#baa38e]">
            All caught up. New member requests will arrive here.
          </p>
        ) : (
          <ul className="divide-y divide-[#f6dc9b]/10">
            {page.map((request) => (
              <li key={request.id} className="grid gap-5 p-6 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-base font-bold text-[#fff0d9]">
                    {request.member.displayName}{" "}
                    <span className="text-xs font-normal text-[#bda48e]">
                      #{request.member.memberNumber}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-[#ad9680]">
                    Requested {request.createdAt.toISOString().slice(0, 10)}
                  </p>
                  {request.message && (
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#dfc3a4]">
                      {request.message}
                    </p>
                  )}
                  <Link
                    href={
                      "/clubs/" +
                      encodeURIComponent(clubId) +
                      "/members/" +
                      encodeURIComponent(request.memberRecordId)
                    }
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#ffc17b]"
                  >
                    Open member and manage renewal <ArrowUpRight className="size-4" />
                  </Link>
                </div>
                <RenewalDecisionButtons clubId={clubId} requestId={request.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {next && <Link href={"?cursor=" + encodeURIComponent(next)} className="mt-5 inline-flex min-h-12 items-center rounded-xl border border-[#ffc17b]/25 px-5 text-sm font-bold text-[#ffc17b]">Next pending requests →</Link>}
      <p className="mt-5 flex gap-2 text-xs text-[#ab917c]">
        <ShieldCheck className="size-4 shrink-0" /> Marking reviewed does not charge anyone or renew
        a subscription; use the member record to assign a new B1 term.
      </p>
    </BusinessShell>
  );
}
