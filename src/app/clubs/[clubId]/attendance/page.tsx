import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck2,
  Clock3,
  ScanLine,
  UsersRound,
} from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { clubLocalDate, clockForClub } from "@/lib/attendance-calendar";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { OperationsStat, OperationsSafetyNote } from "@/components/human-motion/operations-ui";
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
      <section aria-label="QR member scanner" className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="hm-section-title">Your live reception desk</h2>
            <p className="hm-small mt-1">The scanner comes first. Manual check-in is always available below.</p>
          </div>
          <span className="hm-ops-pill hm-ops-pill--active">Verified member QR</span>
        </div>
        <div className="hm-ops-qr-primary"><AttendanceScanner clubId={clubId} /></div>
      </section>
      <div className="hm-ops-stats" aria-label="Today's attendance summary">
        <OperationsStat icon={CalendarCheck2} tone="sage" label="Arrivals today" value={count} detail="One per member per club day" />
        <OperationsStat icon={ScanLine} tone="terracotta" label="QR arrivals" value={qrCount} detail="Signed, short-lived codes" />
        <OperationsStat icon={UsersRound} tone="cocoa" label="Staff-assisted" value={count - qrCount} detail={exceptions + " documented exceptions"} />
      </div>
      <div className="mt-7 grid gap-6">
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
      <OperationsSafetyNote>
        No payment is collected during check-in. Medical and Personal records remain separate and private.
        <Link href={`/clubs/${encodeURIComponent(clubId)}/attendance/history`} className="ml-2 inline-flex items-center gap-1 font-semibold underline">
          View history <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </OperationsSafetyNote>
    </BusinessShell>
  );
}
