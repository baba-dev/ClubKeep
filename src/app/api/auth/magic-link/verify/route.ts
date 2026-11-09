import { NextResponse } from "next/server";

/** Avoid accidental browser GET verification with one-time tokens in access logs. */
export function GET() {
  return NextResponse.json(
    { error: "Use the private confirmation form" },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "private, no-store" } }
  );
}
