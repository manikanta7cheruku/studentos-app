import type { Metadata } from "next";
import { AppShell } from "@/features/notifications";
import { ModeratorReportsQueue } from "@/features/reports";

export const metadata: Metadata = {
  title: "Reports Moderation | StudentOS",
  description: "Moderation queue for reported campus content at your college.",
};

export default function ReportsAdminPage() {
  return (
    <AppShell currentPath="/admin">
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6 min-w-0">
        <ModeratorReportsQueue />
      </main>
    </AppShell>
  );
}
