import { Suspense } from "react";
import { redirect } from "next/navigation";
export default function SetupHome({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>
      }
    >
      <SetupHomeContent params={params} />
    </Suspense>
  );
}

async function SetupHomeContent({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return redirect("/clubs/" + encodeURIComponent(clubId) + "/setup/type");
}
