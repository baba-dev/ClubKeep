"use client";

import { useState } from "react";
import { Doodle } from "./illustrations";

type Phase = "idle" | "scanning" | "done";

const confetti = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2;
  const r = 70 + (i % 3) * 22;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, c: (i % 6) + 1, rot: i * 47 };
});

export function SketchCheckIn() {
  const [phase, setPhase] = useState<Phase>("idle");

  function tap() {
    if (phase === "scanning") return;
    if (phase === "done") {
      setPhase("idle");
      return;
    }
    setPhase("scanning");
    window.setTimeout(() => setPhase("done"), 1100);
  }

  return (
    <div className="sk-tapwrap" data-phase={phase}>
      <button type="button" className="sk-tap" onClick={tap} aria-live="polite">
        <span className="sk-tap-pulse" aria-hidden />
        <Doodle name={phase === "done" ? "medal" : "qr"} className="sk-tap-ill" />
        {phase === "done" && (
          <span className="sk-confetti" aria-hidden>
            {confetti.map((c, i) => (
              <i
                key={i}
                style={
                  {
                    "--x": `${c.x}px`,
                    "--y": `${c.y}px`,
                    "--r": `${c.rot}deg`,
                    background: `var(--c${c.c})`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        )}
      </button>
      <p className="sk-tap-title">
        {phase === "idle" && "Tap to check in"}
        {phase === "scanning" && "Scanning…"}
        {phase === "done" && "You're in! +1 streak"}
      </p>
      <p className="sk-hand">
        {phase === "done" ? "see you tomorrow, champ" : "QR · GPS · or ask staff"}
      </p>
    </div>
  );
}
