import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinScreen } from "@/features/auth/join-screen";

export const instant = false;

export const metadata: Metadata = { title: "Join your college | StudentOS" };

async function Join({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <JoinScreen slug={slug} />;
}

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={null}>
      <Join params={params} />
    </Suspense>
  );
}
