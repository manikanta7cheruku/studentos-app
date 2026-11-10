import type { Metadata } from "next";
import { Suspense } from "react";
import { EditApplicationScreen } from "@/features/career";

export const metadata: Metadata = { title: "Edit application | StudentOS" };
export const instant = false;

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditApplicationScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Inner params={params} />
    </Suspense>
  );
}
