import type { BoardKind, BoardName } from "@/lib/api/endpoints";

/** Everything that differs between Lost and found and the Marketplace: words, kinds and the address. */
export const BOARDS: Record<
  BoardName,
  {
    title: string;
    path: string;
    blurb: string;
    kinds: BoardKind[];
    newLabel: string;
    emptyTitle: string;
    emptyText: string;
  }
> = {
  lostfound: {
    title: "Lost and found",
    path: "lost-found",
    blurb: "Lost something or found something? Post it. People write to you privately.",
    kinds: ["lost", "found"],
    newLabel: "New post",
    emptyTitle: "Nothing lost or found",
    emptyText: "Good news. If you lose or find something, post it here.",
  },
  market: {
    title: "Marketplace",
    path: "market",
    blurb: "Buy, sell, rent, give away or ask for what you need. Students only.",
    kinds: ["sell", "rent", "free", "wanted"],
    newLabel: "New listing",
    emptyTitle: "Nothing listed yet",
    emptyText: "Sell a book you are done with, or ask for what you need.",
  },
};

export const KIND_LABEL: Record<BoardKind, string> = {
  lost: "Lost",
  found: "Found",
  sell: "For sale",
  rent: "For rent",
  free: "Free",
  wanted: "Wanted",
};

/** The words on the button that closes a post, for each kind. */
export const RESOLVE_LABEL: Record<BoardKind, string> = {
  lost: "Mark as found",
  found: "Mark as returned",
  sell: "Mark as sold",
  rent: "Mark as rented out",
  free: "Mark as given away",
  wanted: "Mark as found",
};

/** Whether a kind has a price field. */
export const HAS_PRICE: Record<BoardKind, boolean> = {
  lost: false,
  found: false,
  sell: true,
  rent: true,
  free: false,
  wanted: true,
};

export const boardPath = (slug: string, board: BoardName) => `/c/${slug}/${BOARDS[board].path}`;
