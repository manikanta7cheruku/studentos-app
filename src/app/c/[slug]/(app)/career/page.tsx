import type { Metadata } from "next";
import { CareersComingSoon } from "@/features/career/coming-soon";

export const metadata: Metadata = { title: "Careers | StudentOS" };
export const instant = false;

export default function Page() {
  return <CareersComingSoon />;
}
