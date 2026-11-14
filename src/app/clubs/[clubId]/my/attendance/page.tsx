import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { memberAttendancePage, memberArenaSnapshot } from "@/lib/member-projections";
import { idInput } from "@/lib/validations/onboarding";
import { prisma } from "@/lib/prisma";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";

export const metadata: Metadata = { title: "My Sessions · ClubKeep", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MySessions({
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
  const [visits, overview] = member
    ? await Promise.all([
        memberAttendancePage(prisma, clubId, member.id, cursor),
        memberArenaSnapshot(prisma, clubId, member.id),
      ])
    : [[], null];
  const page = visits.slice(0, 20);
  const next = visits.length > 20 ? page.at(-1)?.id : null;
  const activePlan = overview?.terms.some((t) => t.status === "ACTIVE" || t.status === "EXPIRING");
  const fmt = new Intl.DateTimeFormat("en", {
    timeZone: club.timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="visits"
      eyebrow="Every session counts"
      title="Own your momentum."
      summary="A private record of your sessions. Club reception verifies each check-in, so your history stays reliable."
    >
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-[#f6bf80]/25 bg-gradient-to-br from-[#392215] to-[#1a171b] p-7">
          <ScanLine className="size-8 text-[#ffbe76]" />
          <h2 className="mt-5 text-2xl font-black">Scan. Train. Repeat.</h2>
          <p className="mt-3 text-sm leading-7 text-[#d2b4a0]">
            Your actual check-in credential rotates automatically. Printed IDs and screenshots
            cannot replace it.
          </p>
          {member && activePlan ? (
            <Link
              href={"/clubs/" + encodeURIComponent(clubId) + "/my-attendance"}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f6ce87] to-[#e77c26] px-5 text-sm font-black text-[#25130d]"
            >
              Open my live pass <ArrowRight className="size-4" />
            </Link>
          ) : (
            <p className="mt-5 rounded-xl border border-white/15 bg-black/15 p-4 text-sm text-[#f5c491]">
              Ask reception to link or renew your active club membership before using a QR pass.
            </p>
          )}
          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#bfa893]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Only you can see your personal
            session history.
          </p>
        </section>
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#18181d]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="size-5 text-[#ffbe76]" /> Visit history
            </h2>
            <span className="text-xs text-[#b19e90]">{overview?.visitCount ?? 0} total</span>
          </div>
          {!member ? (
            <p className="p-8 text-sm leading-7 text-[#bda99c]">
              Ask reception to link your verified account before your visit history can be
              displayed.
            </p>
          ) : page.length === 0 ? (
            <p className="p-8 text-sm leading-7 text-[#bda99c]">
              No visits recorded yet. Your first training day starts here.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {page.map((visit) => (
                <li
                  key={visit.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-7"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#302720] text-[#ffbc78]">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div>
                      <p className="font-bold text-[#fcebdc]">Recorded session</p>
                      <p className="mt-1 text-xs text-[#ae9c91]">{visit.localDate}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[#e9c29c]">
                      <Clock3 className="size-4" /> {fmt.format(visit.checkedInAt)}
                    </p>
                    <p className="mt-1 text-xs text-[#a99c91]">
                      {visit.method === "QR" ? "Verified QR" : "Reception check-in"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {next && (
            <Link
              href={"?cursor=" + encodeURIComponent(next)}
              className="flex min-h-14 items-center justify-center gap-2 border-t border-white/10 text-sm font-semibold text-[#ffc17b] hover:bg-white/5"
            >
              Older sessions <ArrowRight className="size-4" />
            </Link>
          )}
        </section>
      </div>
    </MemberArenaShell>
  );
}
