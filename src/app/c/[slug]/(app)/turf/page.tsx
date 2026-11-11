import type { Metadata } from "next";
import { VenuesScreen } from "@/features/turf";

export const metadata: Metadata = { title: "Turf and courts | StudentOS" };
export const instant = false;

export default function Page() {
  return <VenuesScreen />;
}
