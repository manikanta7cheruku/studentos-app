import type { Metadata } from "next";
import { AuditScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Audit log | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <AuditScreen />;
}
