import type { Metadata } from "next";
import { AppShell } from "@/features/notifications";
import { ProfileEditScreen } from "@/features/profile";

export const metadata: Metadata = {
  title: "Edit Profile | StudentOS",
  description: "Update your name, bio, interests, and profile visibility.",
};

export default function EditProfilePage() {
  return (
    <AppShell currentPath="/me">
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
        <ProfileEditScreen />
      </main>
    </AppShell>
  );
}
