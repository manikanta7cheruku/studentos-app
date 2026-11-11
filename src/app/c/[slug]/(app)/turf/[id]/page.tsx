import type { Metadata } from "next";
import { Suspense } from "react";
import { VenueDetailScreen } from "@/features/turf";

export const metadata: Metadata = { title: "Venue | StudentOS" };
export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VenueDetailScreen venueId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
