import type { Metadata } from "next";
import { Suspense } from "react";
import { GameDetailScreen } from "@/features/turf";

export const metadata: Metadata = { title: "Game | StudentOS" };
export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameDetailScreen gameId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
