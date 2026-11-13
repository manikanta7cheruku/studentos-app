"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GLOBAL_SLUG, homePath } from "@/lib/home-path";
import { useCollege } from "./college-provider";

/**
 * Lost and found, the Marketplace and Turf belong to one campus: a ground or a lost bag means nothing to the whole country.
 * Global does not offer them, and the addresses send a person home if typed by hand.
 */
export function CollegeOnly({ children }: { children: React.ReactNode }) {
  const { slug } = useCollege();
  const router = useRouter();
  const off = slug === GLOBAL_SLUG;
  React.useEffect(() => {
    if (off) router.replace(homePath(slug));
  }, [off, router, slug]);
  return off ? null : <>{children}</>;
}
