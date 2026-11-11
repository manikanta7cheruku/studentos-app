import Link from "next/link";
import { CalendarDaysIcon, PackageSearchIcon, StoreIcon } from "lucide-react";

/** Three ways into the community boards: Events, Lost and found, and the Marketplace. */
export function ExploreTiles({ slug }: { slug: string }) {
  const tiles = [
    {
      href: `/c/${slug}/events`,
      title: "Events",
      text: "Talks, fests, meetups",
      icon: <CalendarDaysIcon />,
    },
    {
      href: `/c/${slug}/lost-found`,
      title: "Lost and found",
      text: "Lost it? Found it?",
      icon: <PackageSearchIcon />,
    },
    {
      href: `/c/${slug}/market`,
      title: "Marketplace",
      text: "Buy, sell, rent, free",
      icon: <StoreIcon />,
    },
  ];
  return (
    <ul className="stagger grid gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <li key={tile.href}>
          <Link
            href={tile.href}
            className="lift group flex items-center gap-3 rounded-[20px] border border-white/[0.08] bg-surface p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-col sm:items-start sm:gap-4"
          >
            <span className="bg-brand inline-flex size-10 items-center justify-center rounded-xl text-white [&_svg]:size-5">
              {tile.icon}
            </span>
            <span>
              <span className="block text-[15px] font-bold">{tile.title}</span>
              <span className="block text-[12.5px] text-ink-muted">{tile.text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
