import { Suspense } from "react";
import { AdminLayoutShell } from "@/features/admin/components/admin-layout-shell";
import { Skeleton } from "@/components/ui/skeleton";

async function AdminShellWithParams({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const basePath = `/c/${slug}/admin`;
  return <AdminLayoutShell basePath={basePath}>{children}</AdminLayoutShell>;
}

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6">
          <Skeleton className="hidden h-96 w-56 md:block" />
          <div className="flex-1">{children}</div>
        </div>
      }
    >
      <AdminShellWithParams params={params}>{children}</AdminShellWithParams>
    </Suspense>
  );
}
