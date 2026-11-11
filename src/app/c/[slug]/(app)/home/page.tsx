import type { Metadata } from "next";
import { HomeScreen } from "@/features/home";

export const metadata: Metadata = { title: "Home | StudentOS" };
export const instant = false;

export default function Page() {
  return <HomeScreen />;
}
