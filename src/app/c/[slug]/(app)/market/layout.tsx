import { StoreIcon } from "lucide-react";
import { ComingSoon, MARKETPLACE_SOON } from "@/components/app/coming-soon";
import { CollegeOnly } from "@/features/college";
import { COMING_SOON } from "@/lib/features";

// Switched off for this launch (src/lib/features.ts): every page under it shows what it is for and that it is coming.
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  if (COMING_SOON.marketplace) {
    const { slug } = await params;
    return <ComingSoon slug={slug} icon={<StoreIcon aria-hidden="true" />} {...MARKETPLACE_SOON} />;
  }
  return <CollegeOnly>{children}</CollegeOnly>;
}
