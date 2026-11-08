import { Suspense } from "react";
import { CollegeLanding } from "@/features/auth/college-landing";

export const instant = false;

async function Landing({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CollegeLanding slug={slug} />;
}

export default function TenantRootPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={null}>
      <Landing params={params} />
    </Suspense>
  );
}
