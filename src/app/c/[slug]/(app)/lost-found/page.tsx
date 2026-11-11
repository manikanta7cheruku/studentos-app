import type { Metadata } from "next";
import { BoardScreen } from "@/features/board";

export const metadata: Metadata = { title: "Lost and found | StudentOS" };
export const instant = false;

export default function Page() {
  return <BoardScreen board="lostfound" />;
}
