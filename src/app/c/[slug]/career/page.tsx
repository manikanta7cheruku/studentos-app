import Link from "next/link";
import { BriefcaseIcon, SparklesIcon } from "lucide-react";
import { PlaceholderScreen } from "@/features/tenancy";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function CareerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-4xl justify-end px-4 pt-4 md:px-8">
        <Button asChild variant="outline" className="min-h-[44px] gap-2">
          <Link href={`/c/${slug}/career/opportunities`}>
            <SparklesIcon className="size-4 text-accent" aria-hidden="true" />
            <span>Opportunities</span>
          </Link>
        </Button>
      </div>
      <PlaceholderScreen
        moduleName="Career"
        title="Application Tracker & Opportunities"
        description="Track job applications, find verified campus opportunities, and prepare for interviews."
        actionLabel="Add application"
        icon={<BriefcaseIcon className="size-8" />}
      />
    </div>
  );
}
