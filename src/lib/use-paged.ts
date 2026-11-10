"use client";

import * as React from "react";
import { friendlyMessage } from "./api-client";
import { useLoad, type LoadState } from "./use-load";

type Page<T> = { data: T[]; meta: { next_cursor?: string | null } };

/**
 * A list that loads its first page when the screen opens (or the inputs change) and appends more pages with `more()`.
 * The extra pages are tied to the first page they follow, so a reload or a new filter drops them without any effect.
 */
export function usePaged<T>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  deps: React.DependencyList,
): {
  state: LoadState<Page<T>> & { reload: () => void };
  items: T[];
  hasMore: boolean;
  loadingMore: boolean;
  moreError: string | null;
  more: () => void;
} {
  const first = useLoad(() => fetchPage(), deps);
  const [extra, setExtra] = React.useState<{
    after: unknown;
    items: T[];
    cursor: string | null;
  } | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [moreError, setMoreError] = React.useState<string | null>(null);

  const current = first.status === "ready" ? first.data : null;
  const live = extra && current && extra.after === current ? extra : null;
  const items = [...(current?.data ?? []), ...(live?.items ?? [])];
  const cursor = live ? live.cursor : (current?.meta.next_cursor ?? null);

  const more = React.useCallback(() => {
    if (!cursor || !current || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    fetchPage(cursor)
      .then((page) =>
        setExtra({
          after: current,
          items: [...(live?.items ?? []), ...page.data],
          cursor: page.meta.next_cursor ?? null,
        }),
      )
      .catch((caught: unknown) =>
        setMoreError(friendlyMessage(caught, "We could not load more. Please try again.")),
      )
      .finally(() => setLoadingMore(false));
    // fetchPage changes every render; the inputs that matter are the cursor and the first page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, current, loadingMore, live]);

  return { state: first, items, hasMore: Boolean(cursor), loadingMore, moreError, more };
}
