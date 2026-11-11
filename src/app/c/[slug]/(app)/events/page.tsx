import type { Metadata } from "next";
import { EventsScreen } from "@/features/events";

export const metadata: Metadata = { title: "Events | StudentOS" };
export const instant = false;

export default function Page() {
  return <EventsScreen />;
}
