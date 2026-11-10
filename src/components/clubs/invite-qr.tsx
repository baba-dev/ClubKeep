"use client";

import { inviteQrMatrix } from "@/lib/invite-qr";

export function InviteQr({ url }: { url: string }) {
  let path = "";
  try {
    const modules = inviteQrMatrix(url);
    path = modules
      .map((row, y) => row.map((dark, x) => (dark ? `M${x + 4} ${y + 4}h1v1h-1z` : "")).join(""))
      .join("");
  } catch {
    return <p className="text-xs text-amber-200">QR unavailable; share the secure link instead.</p>;
  }
  return (
    <svg
      viewBox="0 0 53 53"
      role="img"
      aria-label="Single-use invitation QR code"
      className="mx-auto size-48 max-w-full rounded-xl bg-white p-2"
      shapeRendering="crispEdges"
    >
      <rect width="53" height="53" fill="#fff" />
      <path d={path} fill="#111" />
    </svg>
  );
}
