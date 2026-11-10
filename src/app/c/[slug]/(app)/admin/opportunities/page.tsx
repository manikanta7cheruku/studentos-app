import type { Metadata } from "next";
import { OpportunitiesAdminScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Opportunities | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <OpportunitiesAdminScreen />;
}
