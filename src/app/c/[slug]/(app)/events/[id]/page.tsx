import type { Metadata } from "next";
import { Suspense } from "react";
import { EventDetailScreen } from "@/features/events";

export const metadata: Metadata = { title: "Event | StudentOS" };
export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailScreen eventId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
