import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Wrappers around the Ideas SQL functions (migration 20261114000000, functions idea_*).
// Every function checks again, inside the database, that the actor is an active member of the college.
// The actor and the college come from the verified login and from requireMember, never from the request body.

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

export async function createIdea(
  actor: string,
  college: string,
  input: {
    title: string;
    body: string;
    topic: string;
    anonymous?: boolean;
    poll?: string[];
  },
) {
  return out(
    await rpc<Dated>("idea_create", {
      p_actor: actor,
      p_college: college,
      p_title: input.title,
      p_body: input.body,
      p_topic: input.topic,
      p_anonymous: input.anonymous ?? false,
      p_poll: input.poll ?? null,
    }),
  );
}

export async function listIdeas(
  actor: string,
  college: string,
  input: {
    sort: "new" | "top";
    topic?: string;
    mine: boolean;
    limit: number;
    cursor: PageCursor | null;
  },
) {
  const rows = await rpc<{ id: string; created_at: string; item: Dated }[] | null>("idea_list", {
    p_actor: actor,
    p_college: college,
    p_sort: input.sort,
    p_topic: input.topic ?? null,
    p_mine: input.mine,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  // The best-of list is one page, so it never has a next page.
  if (input.sort === "top") {
    return {
      nextCursor: null,
      items: (rows ?? []).slice(0, input.limit).map((row) => out(row.item)),
    };
  }
  const { page, nextCursor } = paginate(rows ?? [], input.limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => out(row.item)) };
}

export async function getIdea(actor: string, college: string, idea: string) {
  return out(await rpc<Dated>("idea_get", { p_actor: actor, p_college: college, p_idea: idea }));
}

export async function voteIdea(actor: string, college: string, idea: string, value: -1 | 0 | 1) {
  return out(
    await rpc<Dated>("idea_vote", {
      p_actor: actor,
      p_college: college,
      p_idea: idea,
      p_value: value,
    }),
  );
}

export async function removeIdea(actor: string, college: string, idea: string) {
  await rpc("idea_remove", { p_actor: actor, p_college: college, p_idea: idea });
  return { deleted: true as const };
}

export async function createIdeaComment(
  actor: string,
  college: string,
  idea: string,
  input: { body: string; parent_id?: string | null; anonymous?: boolean },
) {
  return out(
    await rpc<Dated>("idea_comment_create", {
      p_actor: actor,
      p_college: college,
      p_idea: idea,
      p_parent: input.parent_id ?? null,
      p_body: input.body,
      p_anonymous: input.anonymous ?? false,
    }),
  );
}

export async function listIdeaComments(actor: string, college: string, idea: string) {
  const rows = await rpc<Dated[] | null>("idea_comment_list", {
    p_actor: actor,
    p_college: college,
    p_idea: idea,
  });
  return (rows ?? []).map(out);
}

export async function voteIdeaComment(
  actor: string,
  college: string,
  comment: string,
  value: -1 | 0 | 1,
) {
  return out(
    await rpc<Dated>("idea_comment_vote", {
      p_actor: actor,
      p_college: college,
      p_comment: comment,
      p_value: value,
    }),
  );
}

export async function removeIdeaComment(actor: string, college: string, comment: string) {
  await rpc("idea_comment_remove", { p_actor: actor, p_college: college, p_comment: comment });
  return { deleted: true as const };
}

export async function voteIdeaPoll(actor: string, college: string, idea: string, option: number) {
  return out(
    await rpc<Dated>("idea_poll_vote", {
      p_actor: actor,
      p_college: college,
      p_idea: idea,
      p_option: option,
    }),
  );
}
