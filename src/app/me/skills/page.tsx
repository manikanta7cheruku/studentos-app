import type { Metadata } from "next";
import { AppShell } from "@/features/notifications";
import { SkillsScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "My Skills | StudentOS",
  description:
    "Search the skill catalog, set your proficiencies, and attach verified proof of work.",
};

export default function MySkillsPage() {
  return (
    <AppShell currentPath="/me">
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
        <SkillsScreen />
      </main>
    </AppShell>
  );
}
