import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectionsScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Followers | StudentOS" };
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConnectionsScreen />
    </Suspense>
  );
}
