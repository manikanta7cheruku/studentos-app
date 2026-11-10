import type { Metadata } from "next";
import { InvitesScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Invite codes | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <InvitesScreen />;
}
