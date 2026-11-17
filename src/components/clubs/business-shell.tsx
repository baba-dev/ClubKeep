import Link from "next/link";
import {
  House,
  ScanLine,
  UsersRound,
  Layers3,
  CalendarClock,
  Settings2,
  Globe2,
  ArrowLeft,
  Building2,
  Menu,
  Fingerprint,
  WalletCards,
  Trophy,
  ChartColumn,
  ChevronRight,
} from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { requireActiveClubMembership } from "@/lib/club-access";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { ClubKeepBrand, ThemeArtwork } from "@/components/human-motion/media-components";
import { HM_MEDIA } from "@/components/human-motion/media";

type Active =
  | "members"
  | "plans"
  | "renewals"
  | "overview"
  | "attendance"
  | "finance"
  | "insights"
  | "competition"
  | "profile"
  | "settings";

export async function BusinessShell({
  clubId,
  clubName,
  active,
  eyebrow,
  title,
  description,
  children,
}: {
  clubId: string;
  clubName: string;
  active: Active;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const context = await requireActiveClubMembership(prisma, session.user.id, clubId);
  const isOwner = context.role === "OWNER";
  const canManageFinance = isOwner || context.role === "MANAGER";
  const nav = [
    { key: "overview", label: "Overview", href: "", icon: House },
    { key: "attendance", label: "Check-in", href: "/attendance", icon: ScanLine },
    { key: "members", label: "Members", href: "/members", icon: UsersRound },
    { key: "plans", label: "Membership plans", href: "/plans", icon: Layers3 },
    { key: "renewals", label: "Renewals", href: "/renewals", icon: CalendarClock },
    { key: "competition", label: "Sports & challenges", href: "/competition", icon: Trophy },
    ...(canManageFinance
      ? [
          { key: "insights", label: "Insights", href: "/insights", icon: ChartColumn },
          { key: "finance", label: "Finance & dues", href: "/finance", icon: WalletCards },
        ]
      : []),
    ...(isOwner
      ? [
          {
            key: "profile",
            label: "Public profile",
            href: "/settings/public-profile",
            icon: Globe2,
          },
          { key: "settings", label: "Club settings", href: "/settings", icon: Settings2 },
        ]
      : []),
  ];
  const base = "/clubs/" + encodeURIComponent(clubId);
  const mobileKeys = ["overview", "attendance", "members", "competition", "finance"];
  const mobile = nav.filter((item) => mobileKeys.includes(item.key));
  return (
    <div className="hm-app">
      <a href="#main-content" className="hm-skip-link">
        Skip to main content
      </a>
      <div className="hm-layout">
        <aside className="hm-sidebar" aria-label="Club workspace">
          <ClubKeepBrand />
          <div className="hm-club-switcher">
            <p className="hm-switch-label">Your community</p>
            <p className="hm-switch-name" title={clubName}>
              {clubName}
            </p>
            <p className="hm-small capitalize">{context.role.toLowerCase()} workspace</p>
            <Link className="mt-3 flex items-center gap-1 text-xs font-semibold" href="/home">
              Switch club <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <nav className="hm-nav" aria-label="Club navigation">
            <p className="hm-nav-group-label">Club operations</p>
            {nav.map(({ key, label, href, icon: Icon }) => (
              <Link
                key={key}
                href={base + href}
                aria-current={active === key ? "page" : undefined}
                className="hm-nav-link"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/account/security" className="hm-nav-link" style={{ marginTop: "auto" }}>
            <Fingerprint className="size-4" aria-hidden="true" /> Account security
          </Link>
          <div className="hm-sidebar-scene" aria-hidden="true">
            <ThemeArtwork
              pair={HM_MEDIA.illustrations.sidebarLandscape}
              className="hm-scene-art hm-gallery-art"
            />
          </div>
        </aside>
        <div className="hm-shell">
          <header className="hm-header">
            <div className="min-w-0">
              <div className="flex items-center gap-3 lg:hidden">
                <ClubKeepBrand compact />
                <span className="hm-header-title truncate">{clubName}</span>
              </div>
              <div className="hidden lg:block">
                <p className="hm-switch-label">ClubKeep / Club workspace</p>
                <p className="hm-header-title mt-1 truncate">{clubName}</p>
              </div>
            </div>
            <div className="hm-header-actions">
              <ClubThemeToggle />
              <Link
                href="/home"
                className="hm-header-icon"
                title="Switch club"
                aria-label="Switch club"
              >
                <Building2 className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </header>
          <main className="hm-content" id="main-content">
            {active === "overview" ? (
              <div className="sr-only">
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
            ) : (
              <div className="hm-page-intro">
                <Link href={base} className="hm-small inline-flex items-center gap-1.5">
                  <ArrowLeft className="size-3.5" aria-hidden="true" /> Club overview
                </Link>
                <p className="hm-kicker hm-page-eyebrow mt-7">{eyebrow}</p>
                <h1 className="hm-display mt-3">{title}</h1>
                <p>{description}</p>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
      <nav className="hm-mobile-nav" aria-label="Mobile club navigation">
        {mobile.map(({ key, label, href, icon: Icon }) => (
          <Link key={key} href={base + href} aria-current={active === key ? "page" : undefined}>
            <Icon className="size-5" aria-hidden="true" />
            <span className="max-w-full truncate">
              {label === "Sports & challenges"
                ? "Sports"
                : label === "Finance & dues"
                  ? "Finance"
                  : label}
            </span>
          </Link>
        ))}
        <Link href={isOwner ? base + "/settings" : "/home"}>
          <Menu className="size-5" aria-hidden="true" />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
