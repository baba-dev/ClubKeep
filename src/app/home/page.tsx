import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Fingerprint, ShieldCheck, UserRound, Users } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = { title: "Your space · ClubKeep", robots: { index: false } };

export default function ClubKeepHome() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">
          <p role="status">Loading your space…</p>
        </main>
      }
    >
      <ClubKeepHomeContent />
    </Suspense>
  );
}

async function ClubKeepHomeContent() {
  const session = await requireSession();
  // Existing legacy users have an account but may not have a PersonalProfile.
  await prisma.personalProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });
  const memberships = await prisma.clubMembership.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
      club: { status: "ACTIVE" },
    },
    select: { id: true, role: true, club: { select: { id: true, name: true, slug: true } } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#0b0705] px-5 py-9 text-[#fbf1e6] sm:px-9">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f6dc9b]/15 pb-6">
          <Link href="/home" className="text-xl font-bold">
            <span className="mr-3 inline-flex size-10 items-center justify-center rounded-xl bg-[#f26b00] text-[#2a1608]">
              CK
            </span>
            ClubKeep
          </Link>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/account/security"
              className="rounded-full border border-[#f6dc9b]/25 px-4 py-2 hover:bg-[#211710]"
            >
              Account security
            </Link>
            <SignOutButton />
          </div>
        </header>
        <p className="mt-10 text-xs font-semibold tracking-widest text-[#f1d58b] uppercase">
          Signed in securely
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Welcome, {session.user.name}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[#b8a08c]">
          One identity for your independent Personal space and every club you are authorized to
          join.
        </p>
        <Link
          href="/clubs/new"
          className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-[#d4a84a] to-[#f26b00] px-5 py-3 text-sm font-semibold text-[#2a1608] hover:brightness-110"
        >
          Create a club
        </Link>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-7">
            <UserRound className="size-7 text-[#ffa451]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">Personal</h2>
            <p className="mt-3 text-sm leading-6 text-[#b8a08c]">
              Your private profile exists independently of any club. Fitness and wellness tools will
              arrive in subsequent phases.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm text-[#f1d58b]">
              <ShieldCheck className="size-4" /> Private by default
            </span>
          </section>
          <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-7">
            <Users className="size-7 text-[#ffa451]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">Your clubs</h2>
            {memberships.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {memberships.map((member) => (
                  <li key={member.id} className="rounded-xl bg-[#25180f] px-4 py-3">
                    <Link
                      href={`/clubs/${member.club.id}`}
                      className="font-semibold text-[#ffa451] underline underline-offset-4"
                    >
                      {member.club.name}
                    </Link>
                    <span className="ml-2 text-xs text-[#b8a08c]">{member.role.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#b8a08c]">
                You have no active club memberships. Create your own club or open a private
                invitation link to join an existing club.
              </p>
            )}
          </section>
        </div>
        <div className="mt-8 rounded-2xl border border-[#f6dc9b]/15 bg-[#251910] p-6">
          <h2 className="text-xl font-semibold">Discover nearby communities</h2>
          <p className="mt-2 text-sm text-[#c3a58b]">
            Explore owner-approved public gyms, yoga studios, dance schools and sports academies.
          </p>
          <Link
            href="/discover/clubs"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#e3b877]/30 px-5 py-2 text-sm text-[#f1c18c]"
          >
            Explore clubs →
          </Link>
        </div>
        <Link
          href="/account/security"
          className="mt-8 inline-flex items-center gap-2 text-[#ffa451] underline underline-offset-4"
        >
          <Fingerprint className="size-4" aria-hidden="true" /> Set up a passkey or manage recovery
        </Link>
      </div>
    </main>
  );
}
