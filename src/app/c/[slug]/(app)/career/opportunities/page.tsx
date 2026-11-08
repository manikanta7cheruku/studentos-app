import { OpportunitiesScreen } from "@/features/opportunities";

export const instant = false;

export default async function OpportunitiesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OpportunitiesScreen slug={slug} />;
}
