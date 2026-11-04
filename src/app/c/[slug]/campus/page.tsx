import { Building2Icon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";

export const instant = false;

export default function CampusPage() {
  return (
    <PlaceholderScreen
      moduleName="Campus"
      title="Campus Feed & Announcements"
      description="Official announcements, campus events, lost & found, and market items will appear here."
      actionLabel="Create campus post"
      icon={<Building2Icon className="size-8" />}
    />
  );
}
