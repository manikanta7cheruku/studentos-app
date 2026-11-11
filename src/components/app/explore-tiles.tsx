import Link from "next/link";
import { CalendarDaysIcon, MapPinnedIcon, PackageSearchIcon, StoreIcon } from "lucide-react";

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
      href: `/c/${slug}/turf`,
      title: "Turf and courts",
      text: "Book a ground",
      icon: <MapPinnedIcon />,
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
    <ul className="stagger grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.href}>
          <Link
            href={tile.href}
            className="lift glass-card group flex h-full items-center gap-2.5 rounded-[16px] px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="bg-brand inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white [&_svg]:size-4">
              {tile.icon}
            </span>
            <span>
              <span className="block text-[13px] font-bold leading-tight">{tile.title}</span>
              <span className="hidden text-[11.5px] leading-tight text-ink-muted sm:block">
                {tile.text}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
