import type { Metadata } from "next";
import { Suspense } from "react";
import { ThreadScreen } from "@/features/messages";

export const metadata: Metadata = { title: "Conversation | StudentOS" };
export const instant = false;

async function Thread({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <ThreadScreen userId={userId} />;
}

export default function Page({ params }: { params: Promise<{ userId: string }> }) {
  return (
    <Suspense fallback={null}>
      <Thread params={params} />
    </Suspense>
  );
}
