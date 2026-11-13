import type { Metadata } from "next";
import { ChallengesScreen } from "@/features/challenges";

export const metadata: Metadata = { title: "Weekly challenge | StudentOS" };
export const instant = false;

export default function Page() {
  return <ChallengesScreen />;
}
