import type { Metadata } from "next";
import { SkillsScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Your strengths | StudentOS" };
export const instant = false;

export default function StrengthsPage() {
  return <SkillsScreen />;
}
