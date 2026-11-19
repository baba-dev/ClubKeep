import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { WellnessInsightsSection } from "@/components/personal/wellness-insights";
export default async function InsightsPage() {
  const userId = await requireWellnessPage();
  return (
    <>
      <h1>Wellness insights</h1>
      <WellnessInsightsSection userId={userId} />
    </>
  );
}
