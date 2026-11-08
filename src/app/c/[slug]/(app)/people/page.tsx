import type { Metadata } from "next";
import { PeopleScreen } from "@/features/profile";

export const metadata: Metadata = { title: "People | StudentOS" };
export const instant = false;

export default function PeoplePage() {
  return <PeopleScreen />;
}
