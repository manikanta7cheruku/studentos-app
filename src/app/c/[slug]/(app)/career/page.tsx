import type { Metadata } from "next";
import { TrackerScreen } from "@/features/career";

export const metadata: Metadata = { title: "My applications | StudentOS" };
export const instant = false;

export default function Page() {
  return <TrackerScreen />;
}
