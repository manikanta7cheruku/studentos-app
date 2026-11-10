import type { Metadata } from "next";
import { VerificationScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Join requests | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <VerificationScreen />;
}
