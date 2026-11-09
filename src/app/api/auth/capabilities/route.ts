import { NextResponse } from "next/server";
import { connection } from "next/server";
import { publicAuthFeatures } from "@/lib/auth-config";

export async function GET() {
  // Provider flags are activated in protected VPS environment, not at build time.
  // Next.js 16 Cache Components must not prerender these capabilities from CI.
  await connection();
  return NextResponse.json(publicAuthFeatures(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
