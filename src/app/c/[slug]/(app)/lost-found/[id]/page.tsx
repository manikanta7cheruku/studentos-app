import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardDetailScreen } from "@/features/board";

export const metadata: Metadata = { title: "Lost and found | StudentOS" };
export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardDetailScreen board="lostfound" postId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
