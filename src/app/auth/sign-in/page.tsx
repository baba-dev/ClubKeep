import { Suspense } from "react";
import type { Metadata } from "next";
import { publicAuthFeatures } from "@/lib/auth-config";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in · ClubKeep",
  robots: { index: false, follow: false },
};

type SignInProps = {
  searchParams: Promise<{ error?: string }>;
};

export default function SignInPage(props: SignInProps) {
  return (
    <Suspense
      fallback={
        <main className="hm-app flex min-h-screen items-center justify-center p-8">
          <p role="status">Preparing sign in…</p>
        </main>
      }
    >
      <SignInContent {...props} />
    </Suspense>
  );
}

async function SignInContent({ searchParams }: SignInProps) {
  const params = await searchParams;
  return <SignInForm features={publicAuthFeatures()} oauthError={params.error ?? null} />;
}
