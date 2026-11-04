import type { Metadata } from "next";
import { AppShell } from "@/features/notifications";
import { ProfileViewScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "My Profile | StudentOS",
  description: "View and manage your student identity, skills, and campus visibility.",
};

export default function MyProfilePage() {
  return (
    <AppShell currentPath="/me">
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
        <ProfileViewScreen />
      </main>
    </AppShell>
  );
}
