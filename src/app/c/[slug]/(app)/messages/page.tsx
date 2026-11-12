import type { Metadata } from "next";
import { MessagesScreen } from "@/features/messages";

export const metadata: Metadata = { title: "Messages | StudentOS" };
export const instant = false;

export default function Page() {
  return <MessagesScreen />;
}
