import type { Metadata } from "next";
import { SkillsScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Your skills | StudentOS" };
export const instant = false;

export default function SkillsPage() {
  return <SkillsScreen />;
}
