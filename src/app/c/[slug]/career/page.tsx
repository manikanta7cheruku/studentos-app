import { BriefcaseIcon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";

export default function CareerPage() {
  return (
    <PlaceholderScreen
      moduleName="Career"
      title="Internships, Jobs & Application Tracker"
      description="Explore curated internships, track your active job applications, and prepare for interviews."
      actionLabel="Browse opportunities"
      icon={<BriefcaseIcon className="size-8" />}
    />
  );
}
