import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClubActive } from "@/lib/member-service";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
import { attendanceSearch } from "@/lib/validations/attendance";

export async function GET(
  request: NextRequest, context: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const query = attendanceSearch.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    if (!query.success) return jsonPrivate({ error: "Enter at least two characters" }, 400);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return jsonPrivate({ error: "Sign in first" }, 401);
    if (!session.user.emailVerified) return jsonPrivate({ error: "Verify your account first" }, 403);
    await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER", "STAFF"]);
    const now = new Date();
    const q = query.data.q;
    const memberNumber = /^\d{1,8}$/.test(q) ? Number(q) : null;
    const members = await prisma.clubMemberRecord.findMany({
      where: {
        clubId, status: "ACTIVE",
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          ...(memberNumber !== null ? [{ memberNumber }] : []),
        ],
      },
      select: {
        id: true, displayName: true, memberNumber: true,
        subscriptions: {
          where: { cancelledAt: null, startAt: { lte: now }, endAt: { gt: now } },
          select: { id: true }, take: 1,
        },
      },
      orderBy: { displayName: "asc" },
      take: 12,
    });
    return jsonPrivate({ members: members.map(member => ({
      id: member.id, name: member.displayName,
      number: member.memberNumber, active: member.subscriptions.length > 0,
    })) });
  } catch (error) {
    return onboardingFailure(error);
  }
}
