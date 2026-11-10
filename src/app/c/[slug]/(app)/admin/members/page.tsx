import type { Metadata } from "next";
import { MembersScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Members | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <MembersScreen />;
}
