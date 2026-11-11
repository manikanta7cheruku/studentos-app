import type { Metadata } from "next";
import { IdeaNewScreen } from "@/features/ideas";

export const metadata: Metadata = { title: "New idea | StudentOS" };
export const instant = false;

export default function Page() {
  return <IdeaNewScreen />;
}
