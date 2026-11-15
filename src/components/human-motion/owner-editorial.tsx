import Link from "next/link";
import { ArrowUpRight, CalendarDays, UsersRound, Trophy, Sparkles } from "lucide-react";
import { HM_MEDIA } from "./media";
import { ThemeArtwork } from "./media-components";
import { AchievementArt } from "./AchievementArt";
import type { OwnerOverviewSnapshot } from "@/lib/owner-dashboard";

const formatDate = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone }).format(date);

export function OwnerEditorial({
  clubId,
  snapshot,
  canInvite,
  timeZone,
}: {
  clubId: string;
  snapshot: OwnerOverviewSnapshot;
  canInvite: boolean;
  timeZone: string;
}) {
  const base = "/clubs/" + encodeURIComponent(clubId);
  const nextChallenge = snapshot.challenges[0];
  return (
    <>
      <section className="hm-section" aria-labelledby="hm-people-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="hm-kicker hm-page-eyebrow">People first</p>
            <h2 className="hm-section-title mt-2" id="hm-people-heading">
              A thriving community starts here.
            </h2>
            <p className="hm-section-subtitle">
              Every welcome, every return visit, every reason to belong.
            </p>
          </div>
          <Link href={base + "/members"} className="hm-button hm-button-secondary">
            View members <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="hm-dashboard-grid">
          <div className="hm-surface hm-activity-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hm-kicker hm-muted">Club membership</p>
                <h3 className="hm-section-title mt-2">Recently joined</h3>
              </div>
              <span className="hm-metric-icon">
                <UsersRound className="size-4" aria-hidden="true" />
              </span>
            </div>
            {snapshot.recentMembers.length ? (
              <ul className="mt-5">
                {snapshot.recentMembers.map((member) => (
                  <li key={member.id} className="hm-activity-row">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="hm-avatar" aria-hidden="true">
                        {member.displayName.trim().slice(0, 1).toUpperCase() || "M"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {member.displayName}
                        </span>
                        <span className="hm-small">
                          Joined {formatDate(member.joinedAt, timeZone)}
                        </span>
                      </span>
                    </span>
                    <span className="hm-small shrink-0 capitalize">
                      {member.status.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className="mt-5 rounded-2xl border border-dashed p-5"
                style={{ borderColor: "var(--hm-line)" }}
              >
                <p className="text-sm font-semibold">Your community is waiting to grow.</p>
                <p className="hm-section-subtitle">
                  Welcome your first members and their stories will appear here.
                </p>
                {canInvite && (
                  <Link href="#hm-operations" className="hm-button hm-button-secondary mt-4">
                    Manage invitations
                  </Link>
                )}
              </div>
            )}
          </div>
          <article className="hm-editorial-card">
            <ThemeArtwork pair={HM_MEDIA.photography.community} className="hm-gallery-photo" />
            <div className="hm-editorial-content">
              <p className="hm-kicker">Community spotlight</p>
              <h3>Good things happen together.</h3>
              <p>Make room for people to connect, show up and feel part of something special.</p>
              <Link
                href={base + "/members"}
                className="hm-button mt-5"
                style={{ border: "1px solid #ffffff91" }}
              >
                Your community <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>
      <section className="hm-section" aria-labelledby="hm-momentum-heading">
        <p className="hm-kicker hm-page-eyebrow">Momentum, together</p>
        <h2 id="hm-momentum-heading" className="hm-section-title mt-2">
          Bring the energy beyond the everyday.
        </h2>
        <p className="hm-section-subtitle">
          Make participation visible and every meaningful milestone worth celebrating.
        </p>
        <div className="hm-bottom-grid mt-5">
          <article className="hm-editorial-card hm-challenge">
            <ThemeArtwork pair={HM_MEDIA.photography.challenge} className="hm-gallery-photo" />
            <ThemeArtwork
              pair={HM_MEDIA.illustrations.challengeLandscape}
              className="hm-gallery-art"
            />
            <div className="hm-editorial-content">
              <p className="hm-kicker">
                <Trophy className="mr-2 inline size-4" aria-hidden="true" /> Club challenge
              </p>
              <h3>{nextChallenge ? nextChallenge.title : "Give your community a new goal."}</h3>
              <p>
                {nextChallenge
                  ? "An active club challenge · Ends " + formatDate(nextChallenge.endAt, timeZone)
                  : "Create a club challenge to bring people together through consistent participation."}
              </p>
              <Link
                href={base + "/competition"}
                className="hm-button mt-5"
                style={{ background: "#f7e8d9", color: "#643b2f" }}
              >
                {nextChallenge ? "See challenge" : "Explore challenges"}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className="hm-editorial-card">
            <ThemeArtwork pair={HM_MEDIA.photography.lifestyle} className="hm-gallery-photo" />
            <div className="hm-editorial-content">
              <p className="hm-kicker">
                <Sparkles className="mr-2 inline size-4" aria-hidden="true" /> Belonging in motion
              </p>
              <h3>More than a membership.</h3>
              <p>
                Make everyday club moments feel effortless—for the people who run it and the people
                who love it.
              </p>
              <Link
                href={base + "/plans"}
                className="hm-button mt-5"
                style={{ border: "1px solid #ffffff91" }}
              >
                Membership plans <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>
      <section
        className="hm-section hm-surface hm-botanical-card"
        aria-labelledby="hm-awards-heading"
      >
        <ThemeArtwork pair={HM_MEDIA.illustrations.botanical} className="hm-gallery-art" />
        <div className="max-w-xl">
          <p className="hm-kicker hm-page-eyebrow">Little wins, lasting pride</p>
          <h2 className="hm-section-title mt-2" id="hm-awards-heading">
            Every achievement tells a story.
          </h2>
          <p className="hm-section-subtitle">
            A preview of the artwork used in club milestones and challenges. Awards are granted only
            when the matching achievement is verified.
          </p>
          <div className="hm-badge-preview" aria-label="Preview achievement designs">
            <AchievementArt
              name="achievement-medal"
              size={66}
              title="Achievement medal design preview"
            />
            <AchievementArt
              name="milestone-badge"
              size={66}
              title="Milestone badge design preview"
            />
            <AchievementArt
              name="challenge-trophy"
              size={66}
              title="Challenge trophy design preview"
            />
            <AchievementArt name="streak-badge" size={66} title="Streak badge design preview" />
          </div>
          <Link href={base + "/competition"} className="hm-button hm-button-secondary mt-5">
            <CalendarDays className="size-4" aria-hidden="true" /> View club performance
          </Link>
        </div>
        <ThemeArtwork
          pair={HM_MEDIA.illustrations.botanicalCorner}
          className="hm-botanical-corner hm-gallery-art"
        />
      </section>
    </>
  );
}
