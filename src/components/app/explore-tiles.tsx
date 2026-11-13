import Link from "next/link";
import {
  CalendarDaysIcon,
  MapPinnedIcon,
  PackageSearchIcon,
  StoreIcon,
  ScaleIcon,
} from "lucide-react";

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
  // Turf, Lost and found and the Marketplace belong to one campus: Global shows Events and the weekly challenge instead.
  const shown =
    slug === "global"
      ? [
          tiles[0]!,
          {
            href: `/c/${slug}/debates`,
            title: "Debates",
            text: "Pick a side",
            icon: <ScaleIcon />,
          },
        ]
      : tiles;
  return (
    <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
      {shown.map((tile) => (
        <li key={tile.href} className="shrink-0">
          <Link
            href={tile.href}
            className="glass-clear inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-95 [&_svg]:size-4 [&_svg]:text-[#b9b4ee]"
          >
            {tile.icon}
            {tile.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
