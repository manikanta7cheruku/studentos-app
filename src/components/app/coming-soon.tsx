import Link from "next/link";
import {
  BookOpenIcon,
  CameraIcon,
  ClockIcon,
  CoinsIcon,
  HomeIcon,
  IdCardIcon,
  LockIcon,
  MessageCircleIcon,
  ShirtIcon,
  SmartphoneIcon,
  WrenchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";

type Tile = { icon: React.ReactNode; title: string; text: string; tint: string };

/**
 * A page for something that is not open yet. A short line on what it is, then four real things a student will be able to do
 * with it (each as its own card), and one quiet line on why it is not here yet. People see what they are waiting for.
 */
export function ComingSoon({
  slug,
  icon,
  title,
  lead,
  tiles,
  why,
}: {
  slug: string;
  icon: React.ReactNode;
  title: string;
  lead: string;
  tiles: Tile[];
  why: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title={title} />
      <section className="glass-card relative overflow-hidden rounded-[24px] p-4">
        <span
          aria-hidden="true"
          className="bg-brand pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="bg-brand inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-white [&_svg]:size-5">
            {icon}
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f0c36a]">
              <ClockIcon aria-hidden="true" className="size-3" /> Coming soon
            </span>
            <p className="mt-1 text-[14.5px] font-semibold leading-snug">{lead}</p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          What you will be able to do
        </h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {tiles.map((tile) => (
            <li key={tile.title} className="glass-card flex flex-col gap-3 rounded-[20px] p-3.5">
              <span
                className={`inline-flex size-10 items-center justify-center rounded-[13px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] [&_svg]:size-5 ${tile.tint}`}
              >
                {tile.icon}
              </span>
              <span>
                <span className="block text-[14.5px] font-bold leading-tight">{tile.title}</span>
                <span className="mt-1 block text-[12.5px] leading-snug text-ink-muted">
                  {tile.text}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="glass-clear flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
        <LockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {why}
      </p>
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
  lead: "Students sell and rent to students, and earn from what they no longer use.",
  tiles: [
    {
      icon: <ShirtIcon aria-hidden="true" />,
      title: "Rent a lab apron",
      text: "Borrow it for the semester instead of buying a new one.",
      tint: "from-[#2fb98a] to-[#2f90b9]",
    },
    {
      icon: <BookOpenIcon aria-hidden="true" />,
      title: "Sell old books",
      text: "Pass last year's textbooks and notes on to juniors.",
      tint: "from-[#5b54d6] to-[#8a5fd0]",
    },
    {
      icon: <WrenchIcon aria-hidden="true" />,
      title: "Lend project kits",
      text: "Drawing sets, tools and materials others need for a week.",
      tint: "from-[#d99a3a] to-[#e0566a]",
    },
    {
      icon: <CoinsIcon aria-hidden="true" />,
      title: "Earn from spare gear",
      text: "Turn unused gadgets and gear into pocket money.",
      tint: "from-[#d6549a] to-[#e0866a]",
    },
  ] satisfies Tile[],
  why: "Payments are not part of this launch, so we are doing the Marketplace properly instead of rushing it. It opens in the college spaces as we team up with colleges.",
};

export const LOSTFOUND_SOON = {
  title: "Lost and found",
  lead: "Get lost things back to their owners, fast, inside your own campus.",
  tiles: [
    {
      icon: <IdCardIcon aria-hidden="true" />,
      title: "Lost your ID card?",
      text: "Post it once and the whole campus sees it.",
      tint: "from-[#5b54d6] to-[#8a5fd0]",
    },
    {
      icon: <SmartphoneIcon aria-hidden="true" />,
      title: "Found a phone?",
      text: "Tell the owner where to pick it up.",
      tint: "from-[#2f9fd0] to-[#4f6fe0]",
    },
    {
      icon: <CameraIcon aria-hidden="true" />,
      title: "Add a photo",
      text: "A clear picture helps the right person recognise it.",
      tint: "from-[#d99a3a] to-[#d6665a]",
    },
    {
      icon: <MessageCircleIcon aria-hidden="true" />,
      title: "Get a quick reply",
      text: "Message the finder, then mark it returned.",
      tint: "from-[#2fb98a] to-[#2f90b9]",
    },
  ] satisfies Tile[],
  why: "Lost and found only works inside one campus, where people can actually meet, so it belongs to the college spaces and not to Global. It opens as we team up with colleges.",
};
