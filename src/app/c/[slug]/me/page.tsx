import { UserIcon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";

export default function MePage() {
  return (
    <PlaceholderScreen
      moduleName="Me"
      title="Student Profile & Settings"
      description="View and update your student profile, verified skills, project portfolio, and notifications."
      actionLabel="Edit my profile"
      icon={<UserIcon className="size-8" />}
    />
  );
}
