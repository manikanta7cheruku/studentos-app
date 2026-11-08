import type { Metadata } from "next";
import { Suspense } from "react";
import { PersonScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Profile | StudentOS" };
export const instant = false;

async function Person({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <PersonScreen userId={userId} />;
}

export default function PersonPage({ params }: { params: Promise<{ userId: string }> }) {
  return (
    <Suspense fallback={null}>
      <Person params={params} />
    </Suspense>
  );
}
