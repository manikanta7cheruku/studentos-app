import type { Metadata } from "next";
import { BoardNewScreen } from "@/features/board";

export const metadata: Metadata = { title: "New post | StudentOS" };
export const instant = false;

export default function Page() {
  return <BoardNewScreen board="lostfound" />;
}
