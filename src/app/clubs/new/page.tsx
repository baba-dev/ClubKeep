import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { CreateClubForm } from "@/components/clubs/create-club-form";

export const metadata: Metadata = { title: "Create a club · ClubKeep", robots: { index: false } };

export default function NewClubPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Preparing club setup…</main>
      }
    >
      <NewClubContent />
    </Suspense>
  );
}
async function NewClubContent() {
  const session = await requireSession();
  return (
    <main className="min-h-screen bg-[#0b0705] px-5 py-12 text-[#fbf1e6]">
      <div className="mx-auto max-w-xl">
        <Link href="/home" className="text-sm text-[#ffa451] underline underline-offset-4">
          ← Back to your space
        </Link>
        <p className="mt-12 text-xs font-semibold tracking-[.22em] text-[#f1d58b] uppercase">
          ClubKeep Business
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Make it your club.</h1>
        <p className="mt-4 leading-7 text-[#b8a08c]">
          Start with your name, then privately invite the people who belong.
        </p>
        <Link href="/demo?role=owner&view=onboarding" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#f1c37e]/30 px-4 text-sm font-bold text-[#f6c18c]">
          Preview every setup step safely before creating a real club →
        </Link>
        {session.user.emailVerified ? (
          <CreateClubForm />
        ) : (
          <p
            role="alert"
            className="mt-9 rounded-2xl border border-[#f1d58b]/25 p-6 text-[#f1d58b]"
          >
            Verify your email or use a verified sign-in method before creating a club.
          </p>
        )}
      </div>
    </main>
  );
}
