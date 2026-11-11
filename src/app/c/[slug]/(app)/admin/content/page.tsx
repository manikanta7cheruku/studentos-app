import type { Metadata } from "next";
import { ContentScreen } from "@/features/admin-console";

export const metadata: Metadata = { title: "Content | StudentOS admin" };
export const instant = false;

export default function Page() {
  return <ContentScreen />;
}
