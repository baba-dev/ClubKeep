"use client";
import { Printer } from "lucide-react";
export function PrintClubReceiptButton({ label = "Print receipt" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#e9bc78] to-[#f26b00] px-5 text-sm font-bold text-[#291807]"
    >
      <Printer className="size-4" />
      {label}
    </button>
  );
}
