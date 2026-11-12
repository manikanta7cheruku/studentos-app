import { adminClient } from "@/server/admin/supabase-admin";
import { mapDbError } from "@/lib/db-error";

// Sex, birth year and the mobile number are not in the profiles table (classmates can read that one through row level
// security). They live in a closed table that only the server reads, and only for the person themselves (migration
// 20261121000000, functions profile_private_get and profile_private_set).

export type PrivateDetails = {
  sex: "woman" | "man" | "non_binary" | "prefer_not_to_say" | null;
  birth_year: number | null;
  phone: string | null;
  phone_visibility: "hidden" | "hosts";
};

export async function getPrivate(userId: string): Promise<PrivateDetails> {
  const { data, error } = await adminClient().rpc("profile_private_get", { p_user: userId });
  if (error) throw mapDbError(error);
  return data as PrivateDetails;
}

/** Changes only the keys in the patch. A key set to null clears it. */
export async function setPrivate(userId: string, patch: Record<string, unknown>) {
  const { error } = await adminClient().rpc("profile_private_set", {
    p_user: userId,
    p_patch: patch,
  });
  if (error) throw mapDbError(error);
}
