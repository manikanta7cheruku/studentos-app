import type { Metadata } from "next";
import { GameNewScreen } from "@/features/turf";

export const metadata: Metadata = { title: "Set up a game | StudentOS" };
export const instant = false;

export default function Page() {
  return <GameNewScreen />;
}
