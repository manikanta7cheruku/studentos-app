import type { Metadata } from "next";
import { OpportunitiesScreen } from "@/features/career";

export const metadata: Metadata = { title: "Opportunities | StudentOS" };
export const instant = false;

export default function Page() {
  return <OpportunitiesScreen />;
}
