import Link from "next/link";
import { ClockIcon, MapPinIcon } from "lucide-react";
import { Poster } from "@/components/app/poster";
import type { Venue } from "@/lib/api/endpoints";
import { hourLabel, priceLabel, titleCase } from "./format";

/** One venue in a list: a gradient cover with its sports, the name as the link, and where, when and how much. */
export function VenueCard({ venue, slug }: { venue: Venue; slug: string }) {
  return (
    <li className="group lift glass-card relative overflow-hidden rounded-[24px] focus-within:ring-2 focus-within:ring-ring">
      <article>
        <Poster seed={venue.id} big={titleCase(venue.sports[0] ?? "Play")} className="h-28 p-3.5">
          <div className="flex h-full flex-col justify-between">
            <div className="flex flex-wrap gap-1.5">
              {venue.sports.map((sport) => (
                <span
                  key={sport}
                  className="glass inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold"
                >
                  {titleCase(sport)}
                </span>
              ))}
            </div>
            {venue.is_manager && venue.pending_count > 0 ? (
              <span className="bg-brand w-fit rounded-full px-3 py-1 text-[12px] font-bold text-white">
                {venue.pending_count} waiting
              </span>
            ) : null}
          </div>
        </Poster>
        <div className="flex flex-col gap-2 p-4">
          <h2 className="text-balance text-[1.15rem] font-bold leading-snug">
            <Link
              href={`/c/${slug}/turf/${venue.id}`}
              className="outline-none after:absolute after:inset-0"
            >
              {venue.name}
            </Link>
          </h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
            {venue.area ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon aria-hidden="true" className="size-3.5" />
                {venue.area}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon aria-hidden="true" className="size-3.5" />
              {hourLabel(venue.open_hour)} to {hourLabel(venue.close_hour)}
            </span>
          </p>
          <p className="text-[14px] font-semibold text-[#b9b4ee]">{priceLabel(venue)}</p>
        </div>
      </article>
    </li>
  );
}
