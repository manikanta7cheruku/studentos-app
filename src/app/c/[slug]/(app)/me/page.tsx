import type { Metadata } from "next";
import { ProfileViewScreen } from "@/features/profile";

export const metadata: Metadata = { title: "My profile" };
export const instant = false;

export default function MePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-12">
      <ProfileViewScreen />
    </div>
  );
}
