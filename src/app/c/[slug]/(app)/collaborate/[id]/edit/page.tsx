import type { Metadata } from "next";
import { Suspense } from "react";
import { EditPostScreen } from "@/features/collaborate";

export const metadata: Metadata = { title: "Edit team post | StudentOS" };
export const instant = false;

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditPostScreen postId={id} />;
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Edit params={params} />
    </Suspense>
  );
}
