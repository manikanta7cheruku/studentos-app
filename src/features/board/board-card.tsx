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

/** One post of the board in a list. The title is the link, stretched over the card. */
export function BoardCard({ post, slug }: { post: BoardItem; slug: string }) {
  const price = priceText(post);
  const done = post.status === "resolved";
  return (
    <li
      className={cn(
        "lift relative flex flex-col gap-2.5 rounded-[20px] border border-white/[0.08] bg-surface p-4 focus-within:ring-2 focus-within:ring-ring",
        done && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="bg-brand inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-bold text-white">
          {KIND_LABEL[post.kind]}
        </span>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success">
            <CheckCircle2Icon aria-hidden="true" className="size-3.5" /> Done
          </span>
        ) : null}
        {price ? (
          <span className="ml-auto font-heading text-[1.05rem] font-extrabold">{price}</span>
        ) : null}
      </div>
      <h2 className="text-balance text-[1.05rem] font-bold leading-snug">
        <Link
          href={`${boardPath(slug, post.board)}/${post.id}`}
          className="outline-none after:absolute after:inset-0"
        >
          {post.title}
        </Link>
      </h2>
      {post.description ? (
        <p className="line-clamp-2 text-[14px] leading-relaxed text-ink-muted">
          {post.description}
        </p>
      ) : null}
      <div className="flex items-center gap-3 text-[12.5px] text-ink-muted">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={post.author.display_name} size="xs" />
          <span className="truncate">{post.author.display_name}</span>
        </span>
        {post.place ? (
          <span className="flex min-w-0 items-center gap-1">
            <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{post.place}</span>
          </span>
        ) : null}
        <span className="ml-auto shrink-0">{timeAgo(post.created_at)}</span>
      </div>
    </li>
  );
}
