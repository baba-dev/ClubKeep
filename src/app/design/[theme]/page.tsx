import { notFound } from "next/navigation";
import { Showcase } from "@/components/design/showcase";
import { getTheme, themes } from "@/components/design/themes";

export function generateStaticParams() {
  return themes.map((t) => ({ theme: t.id }));
}

export default async function DirectionPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme } = await params;
  const t = getTheme(theme);
  if (!t) notFound();
  return <Showcase theme={t} />;
}
