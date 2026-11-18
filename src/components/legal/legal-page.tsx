import Link from "next/link";
import type { ReactNode } from "react";
import { ClubKeepBrand } from "@/components/human-motion/media-components";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { LEGAL_LAST_UPDATED, formatLegalDate } from "@/lib/legal";

/** Public shell for the Terms and Privacy pages (same look as the public directory). */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="hm-app hm-public">
      <div className="hm-public-container">
        <header className="hm-public-header">
          <ClubKeepBrand />
          <div className="flex items-center gap-2">
            <ClubThemeToggle />
            <Link href="/auth/sign-in" className="hm-button hm-button-secondary">
              Sign in
            </Link>
          </div>
        </header>
        <article className="hm-surface mx-auto mt-8 max-w-3xl p-6 sm:p-10">
          <h1 className="hm-display text-3xl sm:text-4xl">{title}</h1>
          <p className="hm-small mt-3">Last updated {formatLegalDate(LEGAL_LAST_UPDATED)}</p>
          <p className="mt-5 leading-7">{intro}</p>
          <div className="mt-8 space-y-8 leading-7">{children}</div>
        </article>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="hm-section-title">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
