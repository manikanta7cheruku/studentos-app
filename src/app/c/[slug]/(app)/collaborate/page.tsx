import type { Metadata } from "next";
import { TeamFinderScreen } from "@/features/collaborate";

export const metadata: Metadata = { title: "Find your team | StudentOS" };
export const instant = false;

export default function CollaboratePage() {
  return <TeamFinderScreen />;
}
