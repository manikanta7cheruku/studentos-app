import type { Metadata } from "next";
import { AnnouncementsAdminScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Announcements | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <AnnouncementsAdminScreen />;
}
