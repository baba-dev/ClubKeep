import { AchievementArt } from "./AchievementArt";
import { AchievementCard } from "./AchievementCard";

export function AchievementExample() {
  return (
    <section aria-label="ClubKeep achievements" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <AchievementArt name="achievement-medal" size={96} title="Achievement medal" />
        <AchievementArt name="milestone-badge" size={96} title="100-session milestone" />
        <AchievementArt name="challenge-trophy" size={96} title="Challenge winner" />
        <AchievementArt name="streak-badge" size={96} title="21-day streak" />
      </div>
      <AchievementCard
        name="streak-badge"
        title="21-day streak"
        description="Your consistency is paying off."
        unlocked
        animated
      />
      <AchievementCard
        name="challenge-trophy"
        title="Challenge winner"
        description="Finish first in a verified challenge."
        unlocked={false}
      />
    </section>
  );
}
