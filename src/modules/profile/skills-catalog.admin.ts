import { adminClient } from "@/server/admin/supabase-admin";
import { suggestedSkill } from "@/lib/suggested-skills";

/**
 * Makes sure a suggested skill (see lib/suggested-skills.ts) exists in the catalog and returns it. Only names from that
 * fixed list are ever created, so a search cannot add anything else. Returns null for any other word.
 */
export async function ensureSuggestedSkill(word: string) {
  const known = suggestedSkill(word);
  if (!known) return null;
  const db = adminClient();
  // A skill with this name (in any letter case) may already exist: then the insert is refused and that is fine.
  await db
    .from("skills")
    .insert({ name: known.name, category: known.category, status: "approved" });
  const { data } = await db
    .from("skills")
    .select("id, name, category")
    .eq("status", "approved")
    .ilike(
      "name",
      known.name.replace(/[\\%_]/g, (c) => `\\${c}`),
    )
    .limit(1);
  const row = data?.[0];
  return row
    ? {
        id: row.id as string,
        name: row.name as string,
        category: (row.category as string | null) ?? null,
      }
    : null;
}
