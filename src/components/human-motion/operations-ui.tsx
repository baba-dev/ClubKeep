import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { ThemeArtwork } from "@/components/human-motion/media-components";
import { HM_MEDIA, type ThemePair } from "@/components/human-motion/media";

export type OperationArt =
  | "botanical"
  | "lifestyle"
  | "challenge"
  | "landscape"
  | "community"
  | "metric-members"
  | "metric-attendance";

const artwork: Record<OperationArt, ThemePair> = {
  botanical: HM_MEDIA.illustrations.botanical,
  lifestyle: HM_MEDIA.photography.lifestyle,
  challenge: HM_MEDIA.illustrations.challengeLandscape,
  landscape: HM_MEDIA.illustrations.sidebarLandscape,
  community: HM_MEDIA.photography.community,
  "metric-members": HM_MEDIA.illustrations.metrics.members,
  "metric-attendance": HM_MEDIA.illustrations.metrics.attendance,
};

export function OperationsBanner({
  eyebrow,
  title,
  description,
  art,
  action,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  art: OperationArt;
  action?: { href: string; label: string };
  compact?: boolean;
}) {
  return (
    <section className={`hm-ops-banner ${compact ? "hm-ops-banner--compact" : ""}`}>
      <ThemeArtwork pair={artwork[art]} className="hm-ops-banner-art hm-gallery-art" />
      <div className="hm-ops-banner-content">
        <p className="hm-kicker hm-page-eyebrow">{eyebrow}</p>
        <h2 className="hm-display mt-2">{title}</h2>
        <p className="hm-small mt-3">{description}</p>
        {action && (
          <Link href={action.href} className="hm-button hm-button-primary mt-4">
            {action.label} <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    </section>
  );
}

export function OperationsStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sage",
  children,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "sage" | "terracotta" | "amber" | "cocoa";
  children?: ReactNode;
}) {
  return (
    <div className={`hm-ops-stat hm-ops-stat--${tone}`}>
      <span className="hm-ops-stat-icon"><Icon aria-hidden="true" className="size-5" /></span>
      <p className="hm-ops-stat-value" aria-label={label + ": " + value}>{value}</p>
      <p className="hm-ops-stat-label">{label}</p>
      {detail && <p className="hm-small mt-1">{detail}</p>}
      {children}
    </div>
  );
}

export function OperationsEmpty({
  icon: Icon,
  title,
  detail,
  children,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div className="hm-ops-empty">
      <ThemeArtwork pair={HM_MEDIA.illustrations.botanicalCorner} className="hm-ops-empty-art hm-gallery-art" />
      <Icon className="relative size-8" style={{ color: "var(--hm-sage-deep)" }} aria-hidden="true" />
      <h3 className="relative mt-3 font-semibold">{title}</h3>
      <p className="hm-small relative mt-2 max-w-lg">{detail}</p>
      {children && <div className="relative mt-5">{children}</div>}
    </div>
  );
}

export function OperationsSafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="hm-ops-safety">
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
