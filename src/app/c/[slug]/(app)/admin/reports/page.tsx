import type { Metadata } from "next";
import { ReportsScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Reports | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <ReportsScreen />;
}
