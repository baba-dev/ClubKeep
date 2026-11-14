import { Suspense } from "react";
import type { Metadata } from "next";
import { DemoExperience } from "@/components/demo/demo-experience";
import { DEMO_ROLES, DEMO_VIEWS, type DemoRole, type DemoView } from "@/lib/demo-fixtures";

export const metadata: Metadata = {
  title: "Explore ClubKeep · Interactive full-feature demo",
  description:
    "Explore owner, manager, staff, athlete and platform-admin flows in a safe fictional ClubKeep experience.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ role?: string; view?: string }> };
export default function DemoPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0d10] p-8 text-[#ffd4a0]">
          Opening interactive demo…
        </main>
      }
    >
      <DemoPageContent {...props} />
    </Suspense>
  );
}
async function DemoPageContent({ searchParams }: Props) {
  const params = await searchParams;
  const role: DemoRole = DEMO_ROLES.find((r) => r === params.role) ?? "owner";
  const view: DemoView = DEMO_VIEWS.find((v) => v === params.view) ?? "overview";
  return <DemoExperience initialRole={role} initialView={view} />;
}
