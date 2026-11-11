import type { Metadata } from "next";
import { EventNewScreen } from "@/features/events";

export const metadata: Metadata = { title: "New event | StudentOS" };
export const instant = false;

export default function Page() {
  return <EventNewScreen />;
}
