import type { Metadata } from "next";
import { MyBookingsScreen } from "@/features/turf";

export const metadata: Metadata = { title: "My bookings | StudentOS" };
export const instant = false;

export default function Page() {
  return <MyBookingsScreen />;
}
