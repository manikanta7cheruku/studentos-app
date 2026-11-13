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
    <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
      {shown.map((tile) => (
        <li key={tile.href}>
          <Link
            href={tile.href}
            className="lift glass-card group flex h-full flex-col items-start gap-3 rounded-[22px] p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
