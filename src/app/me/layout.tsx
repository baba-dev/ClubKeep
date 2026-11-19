import type { Metadata } from "next";
import { PersonalShell } from "@/components/personal/personal-shell";

export const metadata: Metadata = { title: "My space · ClubKeep", robots: { index: false } };

// The layout is a static shell on purpose (cacheComponents): it reads no request data. Because of that,
// EVERY /me page must call requireSession() itself, and each segment has a loading.tsx so client
// navigation between tabs stays instant.
export default function MeLayout({ children }: { children: React.ReactNode }) {
  return <PersonalShell>{children}</PersonalShell>;
}
