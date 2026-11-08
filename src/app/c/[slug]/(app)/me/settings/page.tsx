import type { Metadata } from "next";
import { SettingsScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Settings | StudentOS" };
export const instant = false;

export default function SettingsPage() {
  return <SettingsScreen />;
}
