import type { Metadata } from "next";
import { AppShell } from "@/features/notifications";
import { AnnouncementsView } from "@/features/announcements";

export const metadata: Metadata = {
  title: "Campus Announcements | StudentOS",
  description: "Stay informed with official announcements and notices from your college.",
};

export default function AnnouncementsPage() {
  return (
    <AppShell currentPath="/campus">
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
        <AnnouncementsView />
      </main>
    </AppShell>
  );
}
