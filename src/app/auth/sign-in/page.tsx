import type { Metadata } from "next";
import { publicAuthFeatures } from "@/lib/auth-config";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in · ClubKeep",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <SignInForm features={publicAuthFeatures()} oauthError={params.error ?? null} />;
}
