import Link from "next/link";
import { CheckCircle2Icon, MapPinIcon } from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import type { BoardItem } from "@/lib/api/endpoints";
import { formatInr } from "@/lib/format";
import { timeAgo } from "@/lib/time-ago";
import { KIND_LABEL, boardPath } from "./board-config";

/** The price line: "₹1,200", "Free", or "Wanted" with a budget. Nothing for a lost or found post. */
export function priceText(post: Pick<BoardItem, "kind" | "price_inr">): string | null {
  if (post.kind === "free") return "Free";
  if (post.price_inr === null) return post.kind === "wanted" ? "Name your price" : null;
  const price = formatInr(post.price_inr);
  return post.kind === "rent"
    ? `${price} per day`
    : post.kind === "wanted"
      ? `Up to ${price}`
      : price;
}

/** A small tinted tag for the kind of a post, so lost, found, for sale and the rest read apart at a glance. */
const KIND_TONE: Record<BoardItem["kind"], string> = {
  lost: "bg-[#d99a3a]/18 text-[#f0c27a]",
  found: "bg-[#2fb98a]/18 text-[#7fe3bb]",
  sell: "bg-[#7d74e0]/20 text-[#cfcbf5]",
  rent: "bg-[#2f9fd0]/20 text-[#8fd2f2]",
  free: "bg-[#2fb98a]/18 text-[#7fe3bb]",
  wanted: "bg-[#d6549a]/20 text-[#f0a5cb]",
};

/**
 * One post of the board in a list. The same shape every time: the kind on the left and when on the right, then the title
 * (the link, stretched over the card) and a line of words, and at the bottom who, where, and the price on the right.
 */
export function BoardCard({ post, slug }: { post: BoardItem; slug: string }) {
  const price = priceText(post);
  const done = post.status === "resolved";
  return (
    <li
      className={cn(
        "lift glass-card relative flex flex-col gap-1.5 rounded-[18px] px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring",
        done && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold",
            KIND_TONE[post.kind],
          )}
        >
          {KIND_LABEL[post.kind]}
        </span>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-success">
            <CheckCircle2Icon aria-hidden="true" className="size-3.5" /> Done
          </span>
        ) : null}
        <span className="ml-auto text-[12px] text-ink-muted">{timeAgo(post.created_at)}</span>
      </div>
      <h2 className="text-balance text-[15px] font-bold leading-snug">
        <Link
          href={`${boardPath(slug, post.board)}/${post.id}`}
          className="outline-none after:absolute after:inset-0"
        >
          {post.title}
        </Link>
      </h2>
      {post.description ? (
        <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
          {post.description}
        </p>
      ) : null}
      <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-muted">
        <Avatar name={post.author.display_name} size="xs" />
        <span className="min-w-0 flex-1 truncate">
          {post.author.display_name}
          {post.place ? (
            <>
              <span aria-hidden="true"> · </span>
              <MapPinIcon aria-hidden="true" className="-mt-0.5 mr-0.5 inline size-3" />
              {post.place}
            </>
          ) : null}
        </span>
        {price ? (
          <span className="shrink-0 font-heading text-[15px] font-extrabold text-ink">{price}</span>
        ) : null}
      </div>
    </li>
  );
}
