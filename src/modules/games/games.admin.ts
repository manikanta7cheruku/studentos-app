import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the game SQL functions (migration 20261143000000, functions game_*). Every function checks again, inside the
// database, that the actor is an active member of the college and what they may do with the game. The actor and the college come
// from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type Json = Record<string, unknown>;
const dated = (item: Json) => ({
  ...item,
  starts_at: toIso(item.starts_at as string),
  created_at: toIso(item.created_at as string),
  requests: ((item.requests as Json[] | undefined) ?? []).map((request) => ({
    ...request,
    since: toIso(request.since as string),
  })),
});

export async function createGame(
  actor: string,
  college: string,
  input: {
    sport: string;
    venue: string;
    area?: string;
    starts_at: string;
    hours: number;
    capacity: number;
    price_inr?: number;
    join_mode: "open" | "approval";
    note: string;
  },
) {
  return dated(
    await rpc<Json>("game_create", {
      p_actor: actor,
      p_college: college,
      p_sport: input.sport,
      p_venue: input.venue,
      p_area: input.area ?? null,
      p_starts: input.starts_at,
      p_hours: input.hours,
      p_capacity: input.capacity,
      p_price: input.price_inr ?? null,
      p_mode: input.join_mode,
      p_note: input.note,
    }),
  );
}

export async function listGames(
  actor: string,
  college: string,
  input: { sport?: string; mine: boolean; limit: number },
) {
  const rows = await rpc<{ id: string; item: Json }[] | null>("game_list", {
    p_actor: actor,
    p_college: college,
    p_sport: input.sport?.toLowerCase() ?? null,
    p_mine: input.mine,
    p_limit: input.limit,
  });
  return (rows ?? []).map((row) => dated(row.item));
}

export async function getGame(actor: string, college: string, id: string) {
  return dated(await rpc<Json>("game_get", { p_actor: actor, p_college: college, p_game: id }));
}

export async function joinGame(actor: string, college: string, id: string) {
  return dated(await rpc<Json>("game_join", { p_actor: actor, p_college: college, p_game: id }));
}

export async function leaveGame(actor: string, college: string, id: string) {
  return dated(await rpc<Json>("game_leave", { p_actor: actor, p_college: college, p_game: id }));
}

export async function decideGame(
  actor: string,
  college: string,
  id: string,
  input: { user_id: string; decision: "accepted" | "declined" | "removed" },
) {
  return dated(
    await rpc<Json>("game_decide", {
      p_actor: actor,
      p_college: college,
      p_game: id,
      p_user: input.user_id,
      p_decision: input.decision,
    }),
  );
}

export async function cancelGame(actor: string, college: string, id: string) {
  return dated(await rpc<Json>("game_cancel", { p_actor: actor, p_college: college, p_game: id }));
}
