import { CheckCircle2, CircleDashed, LockKeyhole } from "lucide-react";
import { AchievementArt } from "@/components/human-motion/AchievementArt";

export type VerifiedAwardState = "earned" | "in-progress" | "locked";

export function awardState({
  joined, completed, progress, ended,
}: {
  joined: boolean; completed: boolean; progress: number; ended: boolean;
}): VerifiedAwardState {
  if (joined && completed) return "earned";
  if (joined && progress > 0 && !ended) return "in-progress";
  return "locked";
}

/** Visualizes existing server-verified challenge progress; never claims an independent award ledger. */
export function VerifiedAchievement({
  state, progress, target, kind,
}: {
  state: VerifiedAwardState;
  progress: number;
  target: number;
  kind: "ATTENDANCE" | "PERFORMANCE";
}) {
  const label = state === "earned" ? "Goal met · Verified" : state === "in-progress" ? "In progress" : "Not earned";
  const Icon = state === "earned" ? CheckCircle2 : state === "in-progress" ? CircleDashed : LockKeyhole;
  return (
    <div className={`hm-member-award hm-member-award--${state}`}>
      <AchievementArt name="achievement-medal" size={78} />
      <div className="min-w-0">
        <h3>{kind === "ATTENDANCE" ? "Attendance achievement" : "Performance achievement"}</h3>
        <p>{progress} / {target} {kind === "ATTENDANCE" ? "verified check-ins" : "approved submissions"}</p>
        <span className="hm-member-award-state flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden="true" />{label}</span>
      </div>
    </div>
  );
}
