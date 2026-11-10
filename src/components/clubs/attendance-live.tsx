"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, RefreshCw } from "lucide-react";

export function AttendanceLive() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [router]);
  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 650);
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200">
        <Radio className="size-3.5 motion-safe:animate-pulse" /> Live · refreshes every 15s
      </span>
      <button
        type="button"
        onClick={refresh}
        aria-label="Refresh attendance summary"
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#e0ad6e]/20 px-3 text-xs text-[#e2be95] hover:bg-[#352219]"
      >
        <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
        Refresh now
      </button>
    </div>
  );
}
