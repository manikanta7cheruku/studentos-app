import type { Metadata } from "next";
import { OverviewScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Admin | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <OverviewScreen />;
}
