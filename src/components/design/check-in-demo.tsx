"use client";

import { useState } from "react";
import { Check, MapPin, QrCode, UserRound } from "lucide-react";

const methods = [
  { id: "qr", label: "QR scan", icon: QrCode, hint: "Rotating signed code at the front desk" },
  { id: "gps", label: "GPS", icon: MapPin, hint: "Within 150 m of the gym" },
  { id: "manual", label: "Staff", icon: UserRound, hint: "Trainer marks you in" },
] as const;

type Phase = "idle" | "scanning" | "done";

export function CheckInDemo() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  function go() {
    if (phase !== "idle") {
      setPhase("idle");
      return;
    }
    setPhase("scanning");
    window.setTimeout(() => setPhase("done"), 1300);
  }

  const m = methods[idx];

  return (
    <div className="dk-checkin" data-phase={phase}>
      <div
        className="dk-seg"
        role="tablist"
        aria-label="Check-in method"
        style={{ "--idx": idx } as React.CSSProperties}
      >
        <span className="dk-seg-thumb" aria-hidden />
        {methods.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={i === idx}
            className="dk-seg-btn"
            onClick={() => {
              setIdx(i);
              setPhase("idle");
            }}
          >
            <x.icon size={14} aria-hidden />
            {x.label}
          </button>
        ))}
      </div>

      <button type="button" className="dk-tap" onClick={go} aria-live="polite">
        <span className="dk-tap-ring" aria-hidden />
        <span className="dk-tap-ring dk-tap-ring-2" aria-hidden />
        <span className="dk-tap-core">
          {phase === "done" ? <Check size={34} strokeWidth={3} /> : <m.icon size={32} />}
        </span>
      </button>

      <p className="dk-checkin-title">
        {phase === "idle" && "Tap to check in"}
        {phase === "scanning" && "Checking you in…"}
        {phase === "done" && "You're in. Have a great session!"}
      </p>
      <p className="dk-checkin-hint">
        {phase === "done" ? "Logged 06:42 AM · Streak 12 days" : m.hint}
      </p>
    </div>
  );
}
