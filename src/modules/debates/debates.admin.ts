import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Wrappers around the debate SQL functions (migration 20261133000000, functions debate_*). Every function checks again,
// inside the database, that the actor is an active member of the college. The actor and the college come from the verified
// login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type Dated = Record<string, unknown> & { created_at: string };
const out = <T extends Dated>(item: T): T => ({
  ...item,
  created_at: toIso(item.created_at) as string,
});
const outDebate = (item: Dated & { ends_at: string }) => ({
  ...out(item),
  ends_at: toIso(item.ends_at) as string,
});

export async function createDebate(
  actor: string,
  college: string,
  input: {
    title: string;
    body: string;
    topic: string;
    side_a: string;
    side_b: string;
    hours: number;
    visibility?: "public" | "invite";
    invite_user_ids?: string[];
  },
) {
  return outDebate(
    await rpc<Dated & { ends_at: string }>("debate_create", {
      p_actor: actor,
      p_college: college,
      p_title: input.title,
      p_body: input.body,
      p_topic: input.topic,
      p_side_a: input.side_a,
      p_side_b: input.side_b,
      p_hours: input.hours,
      p_visibility: input.visibility ?? "public",
      p_invites: input.invite_user_ids ?? [],
    }),
  );
}

export async function listDebates(
  actor: string,
  college: string,
  input: {
    status: "live" | "ended" | "all";
    topic?: string;
    limit: number;
    cursor: PageCursor | null;
  },
) {
  const rows = await rpc<
    { id: string; created_at: string; item: Dated & { ends_at: string } }[] | null
  >("debate_list", {
    p_actor: actor,
    p_college: college,
    p_status: input.status,
    p_topic: input.topic ?? null,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  const { page, nextCursor } = paginate(rows ?? [], input.limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => outDebate(row.item)) };
}

export async function getDebate(actor: string, college: string, debate: string) {
  return outDebate(
    await rpc<Dated & { ends_at: string }>("debate_get", {
      p_actor: actor,
      p_college: college,
      p_debate: debate,
    }),
  );
}

export async function pickSide(actor: string, college: string, debate: string, side: 0 | 1) {
  return outDebate(
    await rpc<Dated & { ends_at: string }>("debate_pick_side", {
      p_actor: actor,
      p_college: college,
      p_debate: debate,
      p_side: side,
    }),
  );
}

export async function removeDebate(actor: string, college: string, debate: string) {
  await rpc("debate_remove", { p_actor: actor, p_college: college, p_debate: debate });
  return { deleted: true as const };
}

export async function createArgument(
  actor: string,
  college: string,
  debate: string,
  input: { body: string; anonymous?: boolean },
) {
  return out(
    await rpc<Dated>("debate_argue", {
      p_actor: actor,
      p_college: college,
      p_debate: debate,
      p_body: input.body,
      p_anonymous: input.anonymous ?? false,
    }),
  );
}

export async function listArguments(actor: string, college: string, debate: string) {
  const rows = await rpc<Dated[] | null>("debate_argument_list", {
    p_actor: actor,
    p_college: college,
    p_debate: debate,
  });
  return (rows ?? []).map(out);
}

export async function voteArgument(actor: string, college: string, argument: string, on: boolean) {
  return out(
    await rpc<Dated>("debate_argument_vote", {
      p_actor: actor,
      p_college: college,
      p_argument: argument,
      p_on: on,
    }),
  );
}

export async function removeArgument(actor: string, college: string, argument: string) {
  await rpc("debate_argument_remove", { p_actor: actor, p_college: college, p_argument: argument });
  return { deleted: true as const };
}

export async function inviteToDebate(
  actor: string,
  college: string,
  debate: string,
  users: string[],
) {
  return outDebate(
    await rpc<Dated & { ends_at: string }>("debate_invite_add", {
      p_actor: actor,
      p_college: college,
      p_debate: debate,
      p_users: users,
    }),
  );
}
