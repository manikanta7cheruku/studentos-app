import type { Metadata } from "next";
import { NewApplicationScreen } from "@/features/career";

export const metadata: Metadata = { title: "Add an application | StudentOS" };
export const instant = false;

export default function Page() {
  return <NewApplicationScreen />;
}
