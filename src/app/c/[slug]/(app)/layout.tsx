import { Suspense } from "react";
import { CollegeGate } from "@/features/college";

// Opt out of instant-navigation validation: these screens depend on the signed-in person, which cannot be prerendered.
export const instant = false;

// The door of the college: signed in, a member, then the shell. See src/features/college/college-gate.tsx.
async function Gate({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  return <CollegeGate slug={slug}>{children}</CollegeGate>;
}

export default function CollegeAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy="true" />}>
      <Gate params={params}>{children}</Gate>
    </Suspense>
  );
}
