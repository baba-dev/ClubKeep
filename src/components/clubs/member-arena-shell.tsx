import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  IdCard,
  Zap,
  Trophy,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { ClubKeepBrand, ThemeArtwork } from "@/components/human-motion/media-components";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { HM_MEDIA } from "@/components/human-motion/media";

type Tab = "arena" | "play" | "card" | "visits" | "fees" | "renewal";
const items = [
  { key: "arena", label: "Arena", href: "", Icon: Zap },
  { key: "play", label: "Compete", href: "/play", Icon: Trophy },
  { key: "card", label: "My ID", href: "/card", Icon: IdCard },
  { key: "visits", label: "Sessions", href: "/attendance", Icon: Activity },
  { key: "fees", label: "Payments", href: "/payments", Icon: CreditCard },
  { key: "renewal", label: "Renewal", href: "/renewal", Icon: CalendarDays },
] as const;

export function MemberArenaShell({
  clubId,
  clubName,
  active,
  eyebrow,
  title,
  summary,
  children,
}: {
  clubId: string;
  clubName: string;
  active: Tab;
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  const base = "/clubs/" + encodeURIComponent(clubId) + "/my";
  return (
    <div className="hm-app hm-member hm-member-shell">
      <a href="#member-content" className="hm-skip-link print:hidden">
        Skip to your member content
      </a>
      <header className="hm-member-header print:hidden">
        <div className="hm-member-header-inner">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <ClubKeepBrand />
            <span className="hm-muted hidden text-sm md:inline" aria-hidden="true">
              /
            </span>
            <span
              className="hidden max-w-44 truncate text-sm font-semibold sm:inline"
              title={clubName}
            >
              {clubName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ClubThemeToggle />
            <Link href="/home" className="hm-button hm-button-secondary">
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Switch club</span>
              <span className="sm:hidden">Clubs</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="member-content" className="hm-member-main print:p-0">
        <div className="hm-member-intro relative">
          <div
            className="pointer-events-none absolute -top-12 -right-12 hidden h-60 w-60 opacity-30 md:block"
            aria-hidden="true"
          >
            <ThemeArtwork
              pair={HM_MEDIA.illustrations.botanicalCorner}
              className="hm-gallery-art"
            />
          </div>
          <p className="hm-kicker hm-page-eyebrow flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" /> {eyebrow}
          </p>
          <h1 className="mt-4">{title}</h1>
          <p className="mt-4 text-sm sm:text-base">{summary}</p>
          <p className="hm-small mt-4 inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--hm-sage-deep)]" aria-hidden="true" />
            Your club records stay private to your authorized account.
          </p>
        </div>
        <nav aria-label="Member arena sections" className="hm-member-nav print:hidden">
          {items.map(({ key, label, href, Icon }) => (
            <Link key={key} href={base + href} aria-current={active === key ? "page" : undefined}>
              <Icon className="size-4" aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-7">{children}</div>
      </main>
      <nav aria-label="Mobile member navigation" className="hm-member-mobile-nav print:hidden">
        {items.map(({ key, label, href, Icon }) => (
          <Link key={key} href={base + href} aria-current={active === key ? "page" : undefined}>
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
