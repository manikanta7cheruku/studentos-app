import { BriefcaseIcon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";

export const instant = false;

export default function CareerPage() {
  return (
    <PlaceholderScreen
      moduleName="Career"
      title="Application Tracker & Opportunities"
      description="Track job applications, find verified campus opportunities, and prepare for interviews."
      actionLabel="Add application"
      icon={<BriefcaseIcon className="size-8" />}
    />
  );
}
