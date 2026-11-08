import type { Metadata } from "next";
import { Suspense } from "react";
import { PendingScreen } from "@/features/auth/pending-screen";

export const instant = false;

export const metadata: Metadata = { title: "Your request | StudentOS" };

async function Pending({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PendingScreen slug={slug} />;
}

export default function PendingPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={null}>
      <Pending params={params} />
    </Suspense>
  );
}
