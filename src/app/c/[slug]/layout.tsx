import { Suspense } from "react";
import { sampleColleges, sampleCollege, CollegeAppShell } from "@/features/tenancy";
import { Skeleton } from "@/components/ui/skeleton";

export const instant = false;

async function ShellWithParams({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const college = sampleColleges[slug] ?? sampleCollege;

  return (
    <CollegeAppShell slug={slug} college={college}>
      {children}
    </CollegeAppShell>
  );
}

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-bg">
          <Skeleton className="h-14 w-full md:hidden" />
          <div className="flex flex-1">
            <Skeleton className="hidden h-screen w-28 md:block md:w-32" />
            <div className="flex-1 p-6">
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
        </div>
      }
    >
      <ShellWithParams params={params}>{children}</ShellWithParams>
    </Suspense>
  );
}
