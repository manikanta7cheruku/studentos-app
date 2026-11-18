import { Suspense } from "react";
import type { Metadata } from "next";
import { PeopleScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Network | StudentOS" };
export const instant = false;

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeopleScreen />
    </Suspense>
  );
}
