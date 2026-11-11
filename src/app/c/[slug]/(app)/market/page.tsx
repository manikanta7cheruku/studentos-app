import type { Metadata } from "next";
import { BoardScreen } from "@/features/board";

export const metadata: Metadata = { title: "Marketplace | StudentOS" };
export const instant = false;

export default function Page() {
  return <BoardScreen board="market" />;
}
