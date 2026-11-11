import type { Metadata } from "next";
import { Suspense } from "react";
import { IdeaDetailScreen } from "@/features/ideas";

export const metadata: Metadata = { title: "Idea | StudentOS" };
export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IdeaDetailScreen ideaId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
