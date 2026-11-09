import { NextResponse } from "next/server";
import { publicAuthFeatures } from "@/lib/auth-config";

export function GET() {
  return NextResponse.json(publicAuthFeatures(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
