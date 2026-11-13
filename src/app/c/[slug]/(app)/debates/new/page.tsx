import type { Metadata } from "next";
import { DebateNewScreen } from "@/features/debates";

export const metadata: Metadata = { title: "Start a debate | StudentOS" };
export const instant = false;

export default function Page() {
  return <DebateNewScreen />;
}
