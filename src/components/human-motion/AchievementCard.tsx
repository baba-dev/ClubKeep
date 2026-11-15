import type { ReactNode } from "react";
import { AchievementArt, type AchievementName, type AchievementTheme } from "./AchievementArt";

interface AchievementCardProps {
  name: AchievementName;
  title: string;
  description: ReactNode;
  theme?: AchievementTheme;
  unlocked?: boolean;
  /** For awards or ceremonies only; off by default. */
  animated?: boolean;
}

/** A small, reusable presentation. Pass real earned-state data from the server. */
export function AchievementCard({
  name,
  title,
  description,
  theme = "auto",
  unlocked = true,
  animated = false,
}: AchievementCardProps) {
  return (
    <article
      className={[
        "ck-achievement-card",
        ...(unlocked ? [] : ["ck-achievement-card--locked"]),
      ].join(" ")}
      aria-label={`${title} — ${unlocked ? "earned" : "not yet earned"}`}
    >
      <AchievementArt name={name} theme={theme} size={96} animated={animated && unlocked} />
      <div className="ck-achievement-card__copy">
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="ck-achievement-card__state">{unlocked ? "Earned" : "Not yet earned"}</span>
      </div>
    </article>
  );
}
