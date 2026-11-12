import type { Metadata } from "next";
import { Suspense } from "react";
import { WelcomeClient } from "@/features/onboarding/welcome-client";

export const metadata: Metadata = { title: "Welcome | StudentOS", robots: { index: false } };
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WelcomeClient />
    </Suspense>
  );
}
