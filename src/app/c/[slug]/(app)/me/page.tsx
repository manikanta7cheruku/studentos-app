import type { Metadata } from "next";
import { MeScreen } from "@/features/profile";

export const metadata: Metadata = { title: "My profile | StudentOS" };
export const instant = false;

export default function MePage() {
  return <MeScreen />;
}
