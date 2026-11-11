import type { Metadata } from "next";
import { IdeasScreen } from "@/features/ideas";

export const metadata: Metadata = { title: "Buzz | StudentOS" };
export const instant = false;

export default function Page() {
  return <IdeasScreen />;
}
