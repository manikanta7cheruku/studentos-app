import { UserIcon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";

export const instant = false;

export default function MePage() {
  return (
    <PlaceholderScreen
      moduleName="Me"
      title="Student Profile & Settings"
      description="Manage your profile, skills, verified achievements, and notifications."
      actionLabel="Edit profile"
      icon={<UserIcon className="size-8" />}
    />
  );
}
