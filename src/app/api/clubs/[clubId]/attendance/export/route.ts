import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClubActive } from "@/lib/member-service";
import { utcDate } from "@/lib/membership-dates";
import { attendanceToCsv } from "@/lib/attendance-csv";
import { jsonPrivate, onboardingFailure, PRIVATE_HEADERS } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return jsonPrivate({ error: "Sign in first" }, 401);
    if (!session.user.emailVerified)
      return jsonPrivate({ error: "Verify your account first" }, 403);
    await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    if (!from || !to) return jsonPrivate({ error: "Select a start and end date to export" }, 400);
    let start: Date, end: Date;
    try {
      start = utcDate(from);
      end = utcDate(to);
    } catch {
      return jsonPrivate({ error: "Invalid date range" }, 400);
    }
    if (end < start || end.getTime() - start.getTime() >= 31 * 86400000)
      return jsonPrivate({ error: "Select a range of 31 days or less" }, 400);
    const club = await prisma.club.findFirst({
      where: { id: clubId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!club) return jsonPrivate({ error: "Club not available" }, 404);
    const entries = await prisma.clubAttendance.findMany({
      where: { clubId, localDate: { gte: from, lte: to } },
      orderBy: [{ checkedInAt: "asc" }, { id: "asc" }],
      take: 5001,
      select: {
        localDate: true,
        checkedInAt: true,
        method: true,
        overrideReason: true,
        memberRecord: { select: { memberNumber: true, displayName: true } },
      },
    });
    if (entries.length > 5000)
      return jsonPrivate({ error: "More than 5,000 entries. Export a shorter date range" }, 413);
    const csv = attendanceToCsv(
      entries.map((entry) => ({
        date: entry.localDate,
        checkedInAt: entry.checkedInAt.toISOString(),
        memberNumber: entry.memberRecord.memberNumber,
        memberName: entry.memberRecord.displayName,
        method: entry.method,
        managerException: Boolean(entry.overrideReason),
      }))
    );
    return new Response(csv, {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clubkeep-attendance-${from}-to-${to}.csv"`,
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return onboardingFailure(error);
  }
}
