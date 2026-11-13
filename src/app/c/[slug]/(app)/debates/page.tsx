import type { Metadata } from "next";
import { DebatesScreen } from "@/features/debates";

export const metadata: Metadata = { title: "Debates | StudentOS" };
export const instant = false;

export default function Page() {
  return <DebatesScreen />;
}
