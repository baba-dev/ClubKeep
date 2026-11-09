import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { publicAuthFeatures } from "@/lib/auth-config";
import { requireSession } from "@/lib/required-session";
import { SecurityControls } from "@/components/auth/security-controls";

export const metadata: Metadata = {
  title: "Account security · ClubKeep",
  robots: { index: false },
};

export default function SecurityPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">
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
    <main className="min-h-screen bg-[#0b0705] px-5 py-12 text-[#fbf1e6]">
      <div className="mx-auto max-w-3xl">
        <Link href="/home" className="text-sm text-[#f1d58b] underline underline-offset-4">
          Back to your space
        </Link>
        <h1 className="mt-7 text-4xl font-semibold tracking-tight">Account security</h1>
        <p className="mt-3 text-sm leading-6 text-[#b8a08c]">
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
