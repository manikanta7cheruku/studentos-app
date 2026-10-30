import type { Metadata } from "next";
import { NotificationsView } from "@/features/notifications";

export const metadata: Metadata = {
  title: "Notifications | StudentOS",
  description: "Stay updated with announcements, team requests, and reminders from your college.",
};

export default function NotificationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
      <NotificationsView />
    </main>
  );
}
