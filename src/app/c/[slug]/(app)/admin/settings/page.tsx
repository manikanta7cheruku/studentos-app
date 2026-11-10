import type { Metadata } from "next";
import { SettingsAdminScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Settings | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <SettingsAdminScreen />;
}
