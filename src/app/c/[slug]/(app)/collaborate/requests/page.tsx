import type { Metadata } from "next";
import { RequestsScreen } from "@/features/collaborate";

export const metadata: Metadata = { title: "Requests | StudentOS" };
export const instant = false;

export default function RequestsPage() {
  return <RequestsScreen />;
}
