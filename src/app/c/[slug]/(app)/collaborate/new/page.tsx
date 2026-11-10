import type { Metadata } from "next";
import { NewPostScreen } from "@/features/collaborate";

export const metadata: Metadata = { title: "New team post | StudentOS" };
export const instant = false;

export default function NewPostPage() {
  return <NewPostScreen />;
}
