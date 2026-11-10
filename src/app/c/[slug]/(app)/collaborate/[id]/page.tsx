import type { Metadata } from "next";
import { Suspense } from "react";
import { PostDetailScreen } from "@/features/collaborate";

export const metadata: Metadata = { title: "Team post | StudentOS" };
export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetailScreen postId={id} />;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
