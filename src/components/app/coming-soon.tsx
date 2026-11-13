import Link from "next/link";
import { CheckIcon, ClockIcon, HomeIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";

/**
 * A page for something that is not open yet. It says what it is for with a real example, why it is not here yet, and when it
 * will come (with the colleges), so people know to wait for it instead of wondering whether something is broken.
 */
export function ComingSoon({
  slug,
  icon,
  title,
  lead,
  points,
  why,
}: {
  slug: string;
  icon: React.ReactNode;
  title: string;
  lead: string;
  points: string[];
  why: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title={title} />
      <section className="glass-card relative overflow-hidden rounded-[26px] p-5">
        <span
          aria-hidden="true"
          className="bg-brand pointer-events-none absolute -right-12 -top-14 size-40 rounded-full opacity-20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="bg-brand inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white [&_svg]:size-6">
            {icon}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[#f0c36a]">
            <ClockIcon aria-hidden="true" className="size-3.5" /> Coming soon
          </span>
        </div>
        <p className="relative mt-4 text-[15.5px] leading-relaxed text-ink">{lead}</p>
        <ul className="relative mt-4 flex flex-col gap-2.5">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 text-[14px] leading-snug text-ink/90"
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2fb98a]/20 text-[#5fd6ad]">
                <CheckIcon aria-hidden="true" className="size-3" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </section>
      <section className="glass-clear flex items-start gap-3 rounded-[20px] p-4">
        <LockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
        <p className="text-[13.5px] leading-relaxed text-ink-muted">{why}</p>
      </section>
      <Button asChild variant="outline" className="self-start">
        <Link href={`/c/${slug}/home`}>
          <HomeIcon aria-hidden="true" /> Back to Home
        </Link>
      </Button>
    </div>
  );
}

export const MARKETPLACE_SOON = {
  title: "Marketplace",
  lead: "A student needs a lab apron, a drawing kit or project materials for one semester. Someone else has them sitting at home. The Marketplace lets students sell or rent these to each other, and earn money from what they no longer use.",
  points: [
    "Sell or rent aprons, books, calculators and materials",
    "Earn from things you do not need any more",
    "Find what you need from students on your own campus",
  ],
  why: "Payments are not part of this launch, so we are doing the Marketplace properly instead of rushing it. It opens in the college spaces as we team up with colleges. Until then, keep your things. They will have buyers.",
};

export const LOSTFOUND_SOON = {
  title: "Lost and found",
  lead: "Lost an ID card, a charger or a lab coat? Found a phone in the library? Posting it where the right people see it gets it back to its owner fast.",
  points: [
    "Post what you lost or found, with a photo",
    "Reach students on the same campus",
    "Mark it returned when it is back with its owner",
  ],
  why: "Lost and found only works inside one campus, where people can actually meet, so it belongs to the college spaces and not to Global. It opens as we team up with colleges, one campus at a time.",
};
