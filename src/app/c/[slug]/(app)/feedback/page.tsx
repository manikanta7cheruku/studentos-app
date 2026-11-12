import type { Metadata } from "next";
import { FeedbackScreen } from "@/features/feedback";

export const metadata: Metadata = { title: "Send feedback | StudentOS" };
export const instant = false;

export default function Page() {
  return <FeedbackScreen />;
}
