import type { Metadata } from "next";
import { Suspense } from "react";
import { IdeaNewScreen } from "@/features/ideas";

export const metadata: Metadata = { title: "New buzz | StudentOS" };
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <IdeaNewScreen />
    </Suspense>
  );
}
