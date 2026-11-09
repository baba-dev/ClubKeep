"use client";

import { useEffect, useState } from "react";
import { Check, QrCode } from "lucide-react";

type Phase = "idle" | "scanning" | "done";

/** One-tap check-in button with a gold progress ring. */
export function LuxeCheckIn() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = window.setTimeout(() => setPhase("done"), 1200);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div className="lx-checkin" data-phase={phase}>
      <button
        type="button"
        className="lx-checkin-btn"
        onClick={() => setPhase((p) => (p === "idle" ? "scanning" : p === "done" ? "idle" : p))}
        aria-live="polite"
      >
        <svg viewBox="0 0 100 100" className="lx-checkin-ring" aria-hidden>
          <circle cx="50" cy="50" r="46" className="lx-checkin-track" />
          <circle cx="50" cy="50" r="46" pathLength={100} className="lx-checkin-progress" />
        </svg>
        <span className="lx-checkin-core">
          {phase === "done" ? (
            <Check size={30} strokeWidth={2.5} />
          ) : (
            <QrCode size={28} strokeWidth={1.6} />
          )}
        </span>
      </button>
      <p className="lx-checkin-title">
        {phase === "idle" && "Tap to check in"}
        {phase === "scanning" && "Verifying…"}
        {phase === "done" && "Checked in · 6:41 AM"}
      </p>
    </div>
  );
}

/** Highlights the sidebar link of the section currently in view. */
export function ScrollSpy({ ids }: { ids: string[] }) {
  useEffect(() => {
    const links = new Map<string, Element[]>();
    ids.forEach((id) => links.set(id, Array.from(document.querySelectorAll(`[data-spy="${id}"]`))));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((els, id) =>
            els.forEach((el) => el.toggleAttribute("data-active", id === e.target.id))
          );
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return null;
}
