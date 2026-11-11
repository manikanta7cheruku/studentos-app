import type { Metadata } from "next";
import { FindCollegeScreen } from "@/features/auth/find-college-screen";

export const metadata: Metadata = {
  title: "Find your college | StudentOS",
};

export const instant = false;

export default function FindPage() {
  return <FindCollegeScreen />;
}
