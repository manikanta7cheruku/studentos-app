"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { useCollege } from "@/features/college";

/**
 * The Collaborate and Career areas before their screens are built. It does not pretend: it says what is coming and
 * what the person can do now (a good profile is what teammates and the opportunity list use first).
 */
export function ComingSoon({
  eyebrow,
  title,
  description,
  coming,
}: {
  eyebrow: string;
  title: string;
  description: string;
  coming: { name: string; text: string }[];
}) {
  const { slug } = useCollege();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <ul className="divide-y divide-border glass-card rounded-[22px]">
        {coming.map((item) => (
          <li key={item.name} className="flex flex-col gap-1 p-5 sm:p-6">
            <p className="text-lg font-semibold">{item.name}</p>
            <p className="text-ink-muted">{item.text}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-start gap-3 rounded-card bg-accent-soft p-6">
        <p className="text-lg font-semibold">Get ready now</p>
        <p className="max-w-prose text-ink-muted">
          Add your skills and a short headline. They are the first thing a team or an opportunity
          list looks at.
        </p>
        <Button asChild>
          <Link href={`/c/${slug}/me/edit`}>
            Complete your profile <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
