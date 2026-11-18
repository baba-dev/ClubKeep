import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { publicAuthFeatures } from "@/lib/auth-config";
import { requireSession } from "@/lib/required-session";
import { SecurityControls } from "@/components/auth/security-controls";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { ClubKeepBrand } from "@/components/human-motion/media-components";

export const metadata: Metadata = {
  title: "Account security · ClubKeep",
  robots: { index: false },
};

export default function SecurityPage() {
  return (
    <Suspense
      fallback={
        <main className="hm-app min-h-screen p-8">
          <p role="status">Checking your account…</p>
        </main>
      }
    >
      <SecurityPageContent />
    </Suspense>
  );
}

async function SecurityPageContent() {
  const session = await requireSession();
  if (!session.user) redirect("/auth/sign-in");
  return (
    <main className="hm-app hm-account-security min-h-screen px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <ClubKeepBrand />
          <ClubThemeToggle />
        </div>
        <Link
          href="/home"
          className="text-sm font-semibold text-[var(--hm-sage-deep)] underline underline-offset-4"
        >
          Back to your space
        </Link>
        <h1 className="hm-display mt-7 text-4xl tracking-tight">Account security</h1>
        <p className="hm-muted mt-3 text-sm leading-6">
          Manage trusted ways to access your account. Club staff cannot recover your Personal
          identity.
        </p>
        <SecurityControls
          features={publicAuthFeatures()}
          email={session.user.email}
          verified={session.user.emailVerified}
        />
      </div>
    </main>
  );
}
