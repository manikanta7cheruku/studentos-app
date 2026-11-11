import type { Metadata } from "next";
import { VenueNewScreen } from "@/features/turf";

export const metadata: Metadata = { title: "Add a venue | StudentOS" };
export const instant = false;

export default function Page() {
  return <VenueNewScreen />;
}
