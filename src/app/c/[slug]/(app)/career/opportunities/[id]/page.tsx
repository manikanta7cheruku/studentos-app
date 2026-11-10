import type { Metadata } from "next";
import { Suspense } from "react";
import { OpportunityDetailScreen } from "@/features/career";

export const metadata: Metadata = { title: "Opportunity | StudentOS" };
export const instant = false;

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetailScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Inner params={params} />
    </Suspense>
  );
}
