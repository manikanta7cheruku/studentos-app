import { redirect } from "next/navigation";

export const instant = false;

export default async function TenantRootPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/c/${slug}/campus`);
}
