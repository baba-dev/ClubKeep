import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRIVATE_HEADERS, jsonPrivate } from "@/lib/onboarding-http";
import { exportPersonalData } from "@/lib/personal/personal-service";

// GET so the browser can download it, so it must not be cross-site readable: require same-origin
// fetch metadata and a verified session. The file contains only the signed-in user's own data.
export async function GET(request: Request): Promise<Response> {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    return jsonPrivate({ error: "Forbidden" }, 403);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return jsonPrivate({ error: "Sign in first" }, 401);
  if (!session.user.emailVerified)
    return jsonPrivate({ error: "Verify your account to continue" }, 403);
  const data = await exportPersonalData(prisma, session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...PRIVATE_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="clubkeep-personal-data.json"',
    },
  });
}
