import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "@/lib/errors";
import { mapDbError } from "@/lib/db-error";

// Delete my account, leave a college, view one classmate (migration 20261111000000).
// Server side only: the actor always comes from the verified login, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

// Names of the colleges where this person is the only active admin.
export async function accountBlockers(userId: string): Promise<string[]> {
  return rpc<string[]>("account_blockers", { p_user: userId });
}

// Removes the account for good: the audit rows are written (user id only), the avatar files are removed, and the
// login account is deleted. Everything that belongs to the person goes with it (profile, memberships, posts, requests,
// notifications, saved items, skills). Reports they filed stay without their name. Call it after the code was checked.
export async function deleteAccount(userId: string, requestId: string): Promise<void> {
  await rpc<number>("account_delete_prepare", { p_user: userId, p_request_id: requestId });
  const storage = adminClient().storage.from("avatars");
  const { data: files } = await storage.list(userId, { limit: 100 });
  if (files && files.length > 0) {
    await storage.remove(files.map((file) => `${userId}/${file.name}`));
  }
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
}

export async function leaveCollege(userId: string, slug: string, requestId: string) {
  return rpc<{ id: string; status: string }>("leave_college", {
    p_actor: userId,
    p_slug: slug,
    p_request_id: requestId,
  });
}

type PersonJson = {
  avatar_path: string | null;
} & Record<string, unknown>;

export async function viewPerson(actor: string, college: string, target: string) {
  const { avatar_path, ...person } = await rpc<PersonJson>("profile_view", {
    p_actor: actor,
    p_college: college,
    p_target: target,
  });
  const avatar_url = avatar_path
    ? adminClient().storage.from("avatars").getPublicUrl(avatar_path).data.publicUrl
    : null;
  return { ...person, avatar_url };
}
