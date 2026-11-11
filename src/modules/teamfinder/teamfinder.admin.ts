import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Wrappers around the Team Finder SQL functions (migration 20261107000000, functions tf_*).
// Every function checks again, inside the database, that the actor is an active member of the college.
// The actor and the college come from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type PostJson = Record<string, unknown> & { deadline: string | null; created_at: string };
const postOut = (post: PostJson) => ({
  ...post,
  deadline: toIso(post.deadline),
  created_at: toIso(post.created_at),
});

type ListRow<T> = { id: string; created_at: string; item: T };
function pageOf<T>(rows: ListRow<T>[] | null, limit: number) {
  const { page, nextCursor } = paginate(rows ?? [], limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => row.item) };
}

export async function createTeamPost(
  actor: string,
  college: string,
  input: {
    kind: string;
    title: string;
    description: string;
    deadline?: string | null;
    place?: string;
    join_mode?: "open" | "approval";
    external_link?: string;
    team_link?: string;
    roles: { role_name: string; slots: number; skill_ids: string[] }[];
  },
) {
  const post = await rpc<PostJson>("tf_create_post", {
    p_actor: actor,
    p_college: college,
    p_kind: input.kind,
    p_title: input.title,
    p_description: input.description,
    p_deadline: input.deadline ?? null,
    p_external_link: input.external_link ?? null,
    p_team_link: input.team_link ?? null,
    p_roles: input.roles,
  });
  // The place and the join mode live in their own columns, so they are set right after the post is made.
  await Promise.all([
    input.place
      ? rpc("tf_set_place", { p_actor: actor, p_post: post.id, p_place: input.place })
      : null,
    input.join_mode && input.join_mode !== "approval"
      ? rpc("tf_set_join_mode", { p_actor: actor, p_post: post.id, p_mode: input.join_mode })
      : null,
  ]);
  // The creator is the owner, so the detail shape (team link, pending count) applies.
  return getTeamPost(actor, college, post.id as string);
}

export async function listTeamPosts(
  actor: string,
  college: string,
  input: {
    kind?: string;
    status: string;
    skill?: string;
    q?: string;
    mine: boolean;
    limit: number;
    cursor: PageCursor | null;
  },
) {
  const rows = await rpc<ListRow<PostJson>[] | null>("tf_list_posts", {
    p_actor: actor,
    p_college: college,
    p_kind: input.kind ?? null,
    p_status: input.status === "all" ? null : input.status,
    p_skill: input.skill ?? null,
    p_q: input.q ?? null,
    p_mine: input.mine,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  const { items, nextCursor } = pageOf(rows, input.limit);
  return { nextCursor, items: items.map(postOut) };
}

export async function getTeamPost(actor: string, college: string, post: string) {
  return postOut(
    await rpc<PostJson>("tf_get_post", { p_actor: actor, p_college: college, p_post: post }),
  );
}

export async function updateTeamPost(actor: string, college: string, post: string, patch: object) {
  const { place, ...rest } = patch as { place?: string | null };
  // The place lives in its own column and its own function. The other keys go through the edit function as before.
  if (Object.keys(rest).length > 0) {
    await rpc("tf_update_post", {
      p_actor: actor,
      p_college: college,
      p_post: post,
      p_patch: rest,
    });
  }
  if (place !== undefined) {
    await rpc("tf_set_place", { p_actor: actor, p_post: post, p_place: place ?? "" });
  }
  return getTeamPost(actor, college, post);
}

export async function closeTeamPost(actor: string, college: string, post: string) {
  await rpc("tf_close_post", { p_actor: actor, p_college: college, p_post: post });
  return getTeamPost(actor, college, post);
}

export async function createJoinRequest(
  actor: string,
  college: string,
  post: string,
  role: string,
  message: string,
) {
  const result = await rpc<{ created_at: string } & Record<string, unknown>>("tf_create_request", {
    p_actor: actor,
    p_college: college,
    p_post: post,
    p_role: role,
    p_message: message,
  });
  return { ...result, created_at: toIso(result.created_at) };
}

type DatedItem = { created_at: string; decided_at: string | null } & Record<string, unknown>;
const requestOut = (item: DatedItem) => ({
  ...item,
  created_at: toIso(item.created_at),
  decided_at: toIso(item.decided_at),
});

export async function listJoinRequests(
  actor: string,
  college: string,
  post: string,
  input: { status?: string; limit: number; cursor: PageCursor | null },
) {
  const rows = await rpc<ListRow<DatedItem>[] | null>("tf_list_requests", {
    p_actor: actor,
    p_college: college,
    p_post: post,
    p_status: input.status ?? null,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  const { items, nextCursor } = pageOf(rows, input.limit);
  return { nextCursor, items: items.map(requestOut) };
}

export async function listMyJoinRequests(
  actor: string,
  college: string,
  input: { status?: string; limit: number; cursor: PageCursor | null },
) {
  const rows = await rpc<ListRow<DatedItem>[] | null>("tf_list_my_requests", {
    p_actor: actor,
    p_college: college,
    p_status: input.status ?? null,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  const { items, nextCursor } = pageOf(rows, input.limit);
  return { nextCursor, items: items.map(requestOut) };
}

export async function decideJoinRequest(
  actor: string,
  college: string,
  request: string,
  input: { decision: string; note?: string },
) {
  return rpc<{
    request: { id: string; status: string };
    role: { id: string; slots: number; filled: number };
  }>("tf_decide_request", {
    p_actor: actor,
    p_college: college,
    p_request: request,
    p_decision: input.decision,
    p_note: input.note ?? null,
  });
}

export async function withdrawJoinRequest(
  actor: string,
  college: string,
  request: string,
  requestId: string,
) {
  return rpc<{ id: string; status: string }>("tf_withdraw_request", {
    p_actor: actor,
    p_college: college,
    p_request: request,
    p_request_id: requestId,
  });
}

// One tap join (TMF-11). The host is told by the database function.
export async function joinOpenTeamPost(
  actor: string,
  college: string,
  post: string,
  role?: string,
) {
  await rpc("tf_join_open", {
    p_actor: actor,
    p_college: college,
    p_post: post,
    p_role: role ?? null,
  });
  return getTeamPost(actor, college, post);
}

// Who is in (TMF-12). Only the host and the people who joined get names.
export async function listParticipants(actor: string, college: string, post: string) {
  const rows = await rpc<({ joined_at: string } & Record<string, unknown>)[] | null>(
    "tf_participants",
    { p_actor: actor, p_college: college, p_post: post },
  );
  return (rows ?? []).map((row) => ({ ...row, joined_at: toIso(row.joined_at) }));
}
