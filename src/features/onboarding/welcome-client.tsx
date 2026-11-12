"use client";

import { useSearchParams } from "next/navigation";
import { OnboardingScreen } from "./onboarding-screen";

/** Reads where to go afterwards (?next=) and shows the tour. */
export function WelcomeClient() {
  const params = useSearchParams();
  return <OnboardingScreen next={params.get("next")} />;
}
