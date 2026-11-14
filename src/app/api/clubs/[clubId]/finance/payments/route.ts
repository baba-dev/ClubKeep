import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireClubActive } from "@/lib/member-service";
import { recordClubPayment, recentClubPayments } from "@/lib/finance-service";
import { recordClubPaymentInput } from "@/lib/validations/finance";
import { idInput } from "@/lib/validations/onboarding";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";

type Context = { params: Promise<{ clubId: string }> };
export async function POST(request: NextRequest, { params }: Context): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const guard = await guardOnboardingPost(request, "b4-record-payment", 45, true);
    if (!guard.ok) return guard.response;
    const input = recordClubPaymentInput.safeParse(await readOnboardingBody(request));
    if (!input.success)
      return jsonPrivate({ error: "Check payment amount, method and membership" }, 400);
    const payment = await recordClubPayment(prisma, guard.userId!, clubId, input.data);
    return jsonPrivate(
      {
        payment,
        receiptUrl:
          "/clubs/" +
          encodeURIComponent(clubId) +
          "/finance/receipts/" +
          encodeURIComponent(payment.id),
      },
      payment.repeated ? 200 : 201
    );
  } catch (error) {
    return onboardingFailure(error);
  }
}
export async function GET(request: NextRequest, { params }: Context): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.emailVerified)
      return jsonPrivate({ error: "Sign in and verify your account" }, 401);
    await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    if (cursor && !idInput.safeParse(cursor).success)
      return jsonPrivate({ error: "Invalid cursor" }, 400);
    const rows = await recentClubPayments(prisma, clubId, cursor);
    const page = rows.slice(0, 50);
    return jsonPrivate({ payments: page, nextCursor: rows.length > 50 ? page.at(-1)?.id : null });
  } catch (error) {
    return onboardingFailure(error);
  }
}
