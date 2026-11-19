import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClubKeepBrand } from "@/components/human-motion/media-components";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { PersonalNav } from "./personal-nav";
import "./personal.css";

// Personal never shows club branding or club data in its chrome: it is the individual's own space.
export function PersonalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hm-app hm-member hm-member-shell">
      <a href="#me-content" className="hm-skip-link print:hidden">
        Skip to your content
      </a>
      <header className="hm-member-header print:hidden">
        <div className="hm-member-header-inner">
          <ClubKeepBrand />
          <div className="flex shrink-0 items-center gap-2">
            <ClubThemeToggle />
            <Link href="/home" className="hm-button hm-button-secondary">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Clubs
            </Link>
          </div>
        </div>
      </header>
      <PersonalNav />
      <main id="me-content" className="hm-me-main">
        {children}
      </main>
    </div>
  );
}
