"use client";

import * as React from "react";
import Link from "next/link";
import { PackageSearchIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { api, type BoardKind, type BoardName } from "@/lib/api/endpoints";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { BoardCard } from "./board-card";
import { BOARDS, KIND_LABEL, boardPath } from "./board-config";

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "bg-brand border-transparent text-white shadow-[0_6px_16px_-8px_rgba(8,6,30,0.55)]"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Lost and found, or the Marketplace: the newest posts, filtered by kind. */
export function BoardScreen({ board }: { board: BoardName }) {
  const { slug, college } = useCollege();
  const config = BOARDS[board];
  const [kind, setKind] = React.useState<BoardKind | "all">("all");
  const [showDone, setShowDone] = React.useState(false);
  const list = usePaged(
    (cursor) =>
      api.board.list(slug, {
        board,
        kind: kind === "all" ? undefined : kind,
        status: showDone ? "all" : "open",
        cursor,
      }),
    [slug, board, kind, showDone],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6 md:px-8 md:py-10">
      <PageHeader
        eyebrow={slug === "global" ? "Global" : college.name}
        title={config.title}
        description={config.blurb}
        actions={
          <Button asChild>
            <Link href={`${boardPath(slug, board)}/new`}>
              <PlusIcon aria-hidden="true" /> {config.newLabel}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Kind"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        >
          <Chip pressed={kind === "all"} onClick={() => setKind("all")}>
            Everything
          </Chip>
          {config.kinds.map((value) => (
            <Chip key={value} pressed={kind === value} onClick={() => setKind(value)}>
              {KIND_LABEL[value]}
            </Chip>
          ))}
        </div>
        <div className="flex min-h-10 w-fit items-center gap-3 text-[13.5px]">
          <Switch id="show-done" checked={showDone} onCheckedChange={setShowDone} />
          <label htmlFor="show-done">Also show done posts</label>
        </div>
      </div>

      <div aria-live="polite">
        {list.state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3">
            {[0, 1, 2].map((n) => (
              <div
                key={n}
                className="flex flex-col gap-3 rounded-[20px] border border-white/[0.06] p-4"
              >
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : list.state.status === "error" ? (
          <LoadError
            error={list.state.error}
            onRetry={list.state.reload}
            what={config.title.toLowerCase()}
          />
        ) : list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <PackageSearchIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">{config.emptyTitle}</p>
            <p className="max-w-[30ch] text-[14px] text-ink-muted">{config.emptyText}</p>
            <Button asChild className="mt-1">
              <Link href={`${boardPath(slug, board)}/new`}>{config.newLabel}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="stagger flex flex-col gap-3">
              {list.items.map((post) => (
                <BoardCard key={post.id} post={post} slug={slug} />
              ))}
            </ul>
            {list.hasMore ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button variant="outline" onClick={list.more} disabled={list.loadingMore}>
                  {list.loadingMore ? <Spinner /> : null} Show more
                </Button>
                {list.moreError ? (
                  <p className="text-[13.5px] text-danger">{list.moreError}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 text-center text-[13px] text-ink-muted">
                That is everything for now.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
