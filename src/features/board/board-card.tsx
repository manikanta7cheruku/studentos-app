import Link from "next/link";
import { CheckCircle2Icon, MapPinIcon } from "lucide-react";
import { cn } from "cn";
import type { BoardItem } from "@/lib/api/endpoints";
import { formatInr } from "@/lib/format";
import { timeAgo } from "@/lib/time-ago";
import { boardPath } from "./board-config";
import { KindTag } from "./kind-tag";

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

/**
 * One post of the board in a list. Always the same three rows:
 *   the title (the link, stretched over the card) with the price on the right,
 *   a line or two of words,
 *   and a footer: the kind tag and the place on the left, who and when on the right.
 */
export function BoardCard({ post, slug }: { post: BoardItem; slug: string }) {
  const price = priceText(post);
  const done = post.status === "resolved";
  return (
    <li
      className={cn(
        "lift glass-card relative flex flex-col gap-2 rounded-[20px] px-4 py-3.5 focus-within:ring-2 focus-within:ring-ring",
        done && "opacity-60",
      )}
    >
      {post.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.photo_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="-mx-4 -mt-3.5 mb-1 h-36 w-[calc(100%+2rem)] max-w-none rounded-t-[20px] object-cover"
        />
      ) : null}
      <div className="flex items-start gap-3">
        <h2 className="min-w-0 flex-1 text-balance text-[15.5px] font-semibold leading-snug">
          <Link
            href={`${boardPath(slug, post.board)}/${post.id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {post.title}
          </Link>
        </h2>
        {price ? (
          <span className="tabular shrink-0 pt-px font-heading text-[15.5px] font-extrabold leading-snug">
            {price}
          </span>
        ) : null}
      </div>
      {post.description ? (
        <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
          {post.description}
        </p>
      ) : null}
      <div className="mt-0.5 flex items-center gap-2.5 text-[12.5px] text-ink-muted">
        <KindTag kind={post.kind} />
        {done ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success">
            <CheckCircle2Icon aria-hidden="true" className="size-3.5" /> Done
          </span>
        ) : null}
        {post.place ? (
          <span className="flex min-w-0 items-center gap-1">
            <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{post.place}</span>
          </span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="max-w-[7rem] truncate">{post.author.display_name}</span>
          <span aria-hidden="true">·</span>
          <span>{timeAgo(post.created_at)}</span>
        </span>
      </div>
    </li>
  );
}
