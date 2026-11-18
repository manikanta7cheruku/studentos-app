"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, GraduationCapIcon, MapPinIcon, ShareIcon } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/endpoints";
import { campusPeople, namesLine } from "@/lib/campus";
import { shareInvite } from "@/lib/invite-share";
import { listedCollege } from "@/lib/launch-colleges";
import { useLoad } from "@/lib/use-load";

/**
 * The Campus part of a profile: the college (its short name as a badge when it is one we know, a cap otherwise), the branch and
 * year under it, the city beside the label, and the students from the same college who are on StudentOS, led by the ones most
 * like the person looking. When nobody else is there yet, an invitation takes the place of an empty box.
 */
export function CampusSection({
  slug,
  college,
  branch,
  year,
  place,
  excludeIds,
  viewerInterests,
  viewerBranch,
  viewerYear,
  isSelf = false,
}: {
  slug: string;
  college: string;
  branch?: string | null;
  year?: number | null;
  place?: string | null;
  /** The profile's owner and the viewer: neither counts as "another student". */
  excludeIds: string[];
  viewerInterests?: string[];
  viewerBranch?: string | null;
  viewerYear?: number | null;
  isSelf?: boolean;
}) {
  const known = listedCollege(college);
  const people = useLoad(() => api.people.list(slug), [slug]);
  const sub = [branch, year ? `Class of ${year}` : null].filter(Boolean).join("  ·  ");

  // A short list (the people visible in this space), so this is cheap to work out on every render.
  const campus =
    people.status === "ready"
      ? campusPeople({
          people: people.data,
          college,
          excludeIds,
          viewerInterests,
          viewerBranch,
          viewerYear,
        })
      : null;

  const where = known ? known.short : isSelf ? "your college" : "this college";

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Campus
        </h2>
        {place ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-muted">
            <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{place}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3.5">
        {known ? (
          <span
            aria-hidden="true"
            className="inline-flex size-[46px] shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white/[0.07] text-[10.5px] font-bold tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            {known.short.length > 5 ? known.short.slice(0, 5) : known.short}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-[46px] shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white/[0.07] text-ink/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            <GraduationCapIcon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-[1.28] tracking-[-0.01em] [overflow-wrap:anywhere]">
            {college}
          </p>
          {sub ? <p className="mt-1 text-[13px] text-ink-muted">{sub}</p> : null}
        </div>
      </div>

      {people.status === "loading" ? (
        <div aria-busy="true" className="mt-4 flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : campus && campus.count > 0 ? (
        <Link
          href={`/c/${slug}/people?college=${encodeURIComponent(college)}`}
          className="group -mx-2 mt-3 flex items-center gap-3 rounded-2xl px-2 py-2 outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="flex">
            {campus.list.slice(0, 3).map((person, index) => (
              <Avatar
                key={person.user_id}
                name={person.display_name}
                src={person.avatar_url}
                size="sm"
                className={index ? "-ml-2.5 ring-2 ring-[#1b1b27]" : "ring-2 ring-[#1b1b27]"}
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">
              {campus.count} {campus.count === 1 ? "student" : "students"} from {where}
            </span>
            <span className="block truncate text-[12.5px] text-ink-muted">
              {namesLine(campus.names, campus.more)}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-ink/80 transition-colors group-hover:bg-white/[0.1]"
          >
            <ChevronRightIcon className="size-4" />
          </span>
        </Link>
      ) : campus ? (
        <InviteFriends where={known ? known.short : null} />
      ) : null}
    </div>
  );
}

/** Nobody else from this college is on StudentOS yet: say so kindly and let the person bring friends. */
function InviteFriends({ where }: { where: string | null }) {
  const [note, setNote] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  async function invite() {
    setBusy(true);
    try {
      const { code } = await api.invite.get();
      const result = await shareInvite(code);
      if (result === "copied") setNote("Invite copied. Paste it in a chat.");
    } catch {
      setNote("We could not make your invite. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="flex">
          <span className="size-8 rounded-full border border-dashed border-white/25 bg-white/[0.03]" />
          <span className="-ml-2.5 size-8 rounded-full border border-dashed border-white/25 bg-white/[0.03]" />
          <span className="-ml-2.5 inline-flex size-8 items-center justify-center rounded-full border border-dashed border-white/25 bg-white/[0.03] text-ink/70">
            +
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold">
            {where ? `No one from ${where} yet` : "Be the first from your college"}
          </span>
          <span className="block text-[12.5px] leading-snug text-ink-muted">
            {where
              ? `Invite your friends and build ${where} on StudentOS together.`
              : "Students from this college will show here as they join."}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => void invite()}
        disabled={busy}
        className="mt-3.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[11px] border border-white/[0.13] bg-white/[0.07] text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none transition-colors hover:bg-white/[0.11] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <ShareIcon aria-hidden="true" className="size-4" /> Invite friends
      </button>
      {note ? (
        <p role="status" className="mt-2 text-[12.5px] text-ink-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}
