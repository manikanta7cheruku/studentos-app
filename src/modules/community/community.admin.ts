import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";
import { photoUrl } from "./photos.admin";

// Wrappers around the Events and Board SQL functions (migration 20261115000000, functions event_* and board_*).
// Every function checks again, inside the database, that the actor is an active member of the college.
// The actor and the college come from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type Json = Record<string, unknown>;
const eventOut = (item: Json) => ({
  ...item,
  starts_at: toIso(item.starts_at as string),
  created_at: toIso(item.created_at as string),
});
// A board post also carries its photo: the stored path becomes a public address.
const dated = (item: Json) => {
  const { photo_path, ...rest } = item as Json & { photo_path?: string | null };
  return {
    ...rest,
    created_at: toIso(item.created_at as string),
    ...("photo_path" in item ? { photo_url: photoUrl(photo_path ?? null) } : {}),
  };
};

// ---- Events ----
export async function createEvent(
  actor: string,
  college: string,
  input: {
    title: string;
    description: string;
    starts_at: string;
    place?: string;
    capacity?: number;
    invite_only?: boolean;
  },
) {
  return eventOut(
    await rpc<Json>("event_create", {
      p_actor: actor,
      p_college: college,
      p_title: input.title,
      p_description: input.description,
      p_starts: input.starts_at,
      p_place: input.place ?? null,
      p_capacity: input.capacity ?? null,
      p_invite_only: input.invite_only ?? false,
    }),
  );
}

export async function listEvents(
  actor: string,
  college: string,
  input: { when: "upcoming" | "past"; mine: boolean; limit: number },
) {
  const rows = await rpc<{ id: string; item: Json }[] | null>("event_list", {
    p_actor: actor,
    p_college: college,
    p_when: input.when,
    p_mine: input.mine,
    p_limit: input.limit,
  });
  return (rows ?? []).map((row) => eventOut(row.item));
}

export async function getEvent(actor: string, college: string, id: string) {
  return eventOut(
    await rpc<Json>("event_get", { p_actor: actor, p_college: college, p_event: id }),
  );
}

export async function rsvpEvent(actor: string, college: string, id: string, going: boolean) {
  return eventOut(
    await rpc<Json>("event_rsvp", {
      p_actor: actor,
      p_college: college,
      p_event: id,
      p_going: going,
    }),
  );
}

export async function cancelEvent(actor: string, college: string, id: string) {
  return eventOut(
    await rpc<Json>("event_cancel", { p_actor: actor, p_college: college, p_event: id }),
  );
}

// ---- Board ----
export async function createBoardPost(
  actor: string,
  college: string,
  input: {
    board: string;
    kind: string;
    title: string;
    description: string;
    place?: string;
    price_inr?: number;
  },
) {
  return dated(
    await rpc<Json>("board_create", {
      p_actor: actor,
      p_college: college,
      p_board: input.board,
      p_kind: input.kind,
      p_title: input.title,
      p_description: input.description,
      p_place: input.place ?? null,
      p_price: input.price_inr ?? null,
    }),
  );
}

export async function listBoardPosts(
  actor: string,
  college: string,
  input: {
    board: string;
    kind?: string;
    status: string;
    mine: boolean;
    limit: number;
    cursor: PageCursor | null;
  },
) {
  const rows = await rpc<{ id: string; created_at: string; item: Json }[] | null>("board_list", {
    p_actor: actor,
    p_college: college,
    p_board: input.board,
    p_kind: input.kind ?? null,
    p_status: input.status === "all" ? null : input.status,
    p_mine: input.mine,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  const { page, nextCursor } = paginate(rows ?? [], input.limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => dated(row.item)) };
}

export async function getBoardPost(actor: string, college: string, id: string) {
  return dated(await rpc<Json>("board_get", { p_actor: actor, p_college: college, p_post: id }));
}

export async function setBoardStatus(actor: string, college: string, id: string, status: string) {
  return dated(
    await rpc<Json>("board_set_status", {
      p_actor: actor,
      p_college: college,
      p_post: id,
      p_status: status,
    }),
  );
}

export async function removeBoardPost(actor: string, college: string, id: string) {
  await rpc("board_remove", { p_actor: actor, p_college: college, p_post: id });
  return { deleted: true as const };
}

export async function listBoardMessages(actor: string, college: string, id: string) {
  const rows = await rpc<Json[] | null>("board_messages_list", {
    p_actor: actor,
    p_college: college,
    p_post: id,
  });
  return (rows ?? []).map(dated);
}

export async function sendBoardMessage(
  actor: string,
  college: string,
  id: string,
  input: { body: string; to_user?: string },
) {
  return dated(
    await rpc<Json>("board_message_send", {
      p_actor: actor,
      p_college: college,
      p_post: id,
      p_to: input.to_user ?? null,
      p_body: input.body,
    }),
  );
}
