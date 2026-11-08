import type { Metadata } from "next";
import { EditProfileScreen } from "@/features/profile";

export const metadata: Metadata = { title: "Edit profile | StudentOS" };
export const instant = false;

export default function EditProfilePage() {
  return <EditProfileScreen />;
}
