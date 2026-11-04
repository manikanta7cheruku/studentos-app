import { UsersIcon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";

export const instant = false;

export default function CollaboratePage() {
  return (
    <PlaceholderScreen
      moduleName="Collaborate"
      title="Team Finder & Student Projects"
      description="Connect with classmates, form study groups, and find teammates for hackathons or course projects."
      actionLabel="Create team request"
      icon={<UsersIcon className="size-8" />}
    />
  );
}
