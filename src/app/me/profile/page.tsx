import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { getOverview } from "@/lib/personal/personal-service";
import { BioForm } from "@/components/personal/bio-form";
import { DataControls } from "@/components/personal/data-controls";

export default async function ProfilePage() {
  const session = await requireSession();
  const o = await getOverview(prisma, session.user.id);
  return (
    <>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-hm-display, inherit)" }}>Profile</h1>
      </header>
      <BioForm {...o.profile} />
      <DataControls />
    </>
  );
}
