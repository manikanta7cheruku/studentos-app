import type { Metadata } from "next";
import { SetupScreen } from "@/features/auth/setup-screen";

export const metadata: Metadata = { title: "Set up your campus | StudentOS" };
export const instant = false;

// For a college admin with a one-time setup code from the platform owner (decision D-30).
export default function SetupPage() {
  return <SetupScreen />;
}
