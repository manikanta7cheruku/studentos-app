import type { Metadata } from "next";
import { CampusScreen } from "@/features/campus";

export const instant = false;
export const metadata: Metadata = { title: "Campus" };

export default function CampusPage() {
  return <CampusScreen />;
}
