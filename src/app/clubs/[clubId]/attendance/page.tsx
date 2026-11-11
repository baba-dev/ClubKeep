import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck2,
  Clock3,
  ScanLine,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { clubLocalDate, clockForClub } from "@/lib/attendance-calendar";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { AttendanceLive } from "@/components/clubs/attendance-live";
import { AttendanceScanner } from "@/components/clubs/attendance-scanner";
import { ManualCheckIn } from "@/components/clubs/manual-checkin";
import { AttendanceTodayFeed } from "@/components/clubs/attendance-today-feed";
import { AttendanceTimeZoneSetting } from "@/components/clubs/attendance-timezone-setting";

export const metadata: Metadata = { title: "Attendance · ClubKeep", robots: { index: false } };
export default function AttendancePage({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">
          Preparing the reception desk…
        </main>
      }
    >
      <AttendanceContent params={params} />
    </Suspense>
  );
}
async function AttendanceContent({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  const access = await requireClubActive(prisma, session.user.id, clubId, [
    "OWNER",
    "MANAGER",
    "STAFF",
  ]);
  const club = await prisma.club.findFirstOrThrow({
    where: { id: clubId, status: "ACTIVE" },
    select: { name: true, timeZone: true },
  });
  const now = new Date();
  const day = clubLocalDate(now, club.timeZone);
  const [count, qrCount, exceptions, arrivals] = await Promise.all([
    prisma.clubAttendance.count({ where: { clubId, localDate: day } }),
    prisma.clubAttendance.count({ where: { clubId, localDate: day, method: "QR" } }),
    prisma.clubAttendance.count({
      where: { clubId, localDate: day, overrideReason: { not: null } },
    }),
    prisma.clubAttendance.findMany({
      where: { clubId, localDate: day },
      orderBy: [{ checkedInAt: "desc" }, { id: "desc" }],
      take: 16,
      select: {
        id: true,
        checkedInAt: true,
        method: true,
        overrideReason: true,
        memberRecord: { select: { id: true, displayName: true, memberNumber: true } },
      },
    }),
  ]);
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="attendance"
      eyebrow="Reception · live attendance"
      title="Make every arrival count."
      description="A warm welcome in seconds. Scan a member’s live QR or find them by name—every entry stays accurate and club-private."
    >
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs text-[#bca088]">
          <Clock3 className="size-4 text-[#e7b56e]" />
          {day} · {clockForClub(now, club.timeZone)} · {club.timeZone}
        </p>
        <AttendanceLive />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[#ffc57d]/25 bg-gradient-to-br from-[#352011] via-[#281910] to-[#15100b] p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-[#f18626]/15 blur-2xl"
          />
          <CalendarCheck2 className="size-6 text-[#f8c37e]" aria-hidden="true" />
          <p className="mt-4 text-4xl font-semibold tracking-tight text-[#fff0dc]">{count}</p>
          <p className="mt-1 text-sm font-medium text-[#d3b79b]">Arrivals today</p>
          <p className="mt-2 text-xs text-[#a98e76]">One per member per club day</p>
        </div>
        <div className="rounded-[1.5rem] border border-[#f6dc9b]/15 bg-[#1d140e] p-6">
          <ScanLine className="size-6 text-[#ebbd83]" />
          <p className="mt-4 text-4xl font-semibold">{qrCount}</p>
          <p className="mt-1 text-sm font-medium text-[#d3b79b]">QR arrivals</p>
          <p className="mt-2 text-xs text-[#a98e76]">Signed, short-lived codes</p>
        </div>
        <div className="rounded-[1.5rem] border border-[#f6dc9b]/15 bg-[#1d140e] p-6">
          <UsersRound className="size-6 text-[#ebbd83]" />
          <p className="mt-4 text-4xl font-semibold">{count - qrCount}</p>
          <p className="mt-1 text-sm font-medium text-[#d3b79b]">Staff-assisted</p>
          <p className="mt-2 text-xs text-[#a98e76]">{exceptions} documented exceptions</p>
        </div>
      </div>
      <div className="mt-7 grid gap-6">
        <AttendanceScanner clubId={clubId} />
        <div className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
          <ManualCheckIn
            clubId={clubId}
            canOverride={access.role === "OWNER" || access.role === "MANAGER"}
          />
          <AttendanceTodayFeed
            clubId={clubId}
            timeZone={club.timeZone}
            entries={arrivals.map((entry) => ({
              id: entry.id,
              method: entry.method,
              checkedInAt: entry.checkedInAt.toISOString(),
              overrideReason: entry.overrideReason,
              member: {
                id: entry.memberRecord.id,
                displayName: entry.memberRecord.displayName,
                memberNumber: entry.memberRecord.memberNumber,
              },
            }))}
          />
        </div>
      </div>
      {access.role === "OWNER" && (
        <AttendanceTimeZoneSetting clubId={clubId} timeZone={club.timeZone} />
      )}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f6dc9b]/15 bg-[#1b130d] p-5 sm:p-7">
        <p className="flex items-start gap-2 text-sm leading-6 text-[#bb9e83]">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-[#f5c485]" />
          No payment is collected during check-in. Medical and Personal records remain separate and
          private.
        </p>
        <Link
          href={`/clubs/${clubId}/attendance/history`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#eab572]/25 px-4 text-sm font-semibold text-[#f6c284] hover:bg-[#382519]"
        >
          View history <ArrowRight className="size-4" />
        </Link>
      </div>
    </BusinessShell>
  );
}
