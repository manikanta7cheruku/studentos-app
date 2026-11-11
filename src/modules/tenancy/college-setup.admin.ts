import { createHash } from "node:crypto";
import { adminClient } from "@/server/admin/supabase-admin";
import { mapDbError } from "@/lib/db-error";

// Wrapper around the college setup SQL function (migration 20261114000000, college_setup_create).
// The code is only ever compared by its hash; the database never holds the code itself.

const METHODS = {
  email: { methods: ["email_domain"], approval: false },
  invite: { methods: ["invite_code"], approval: false },
  approval: { methods: ["manual", "email_domain"], approval: true },
} as const;

export type CollegeSetupInput = {
  code: string;
  slug: string;
  name: string;
  short_name?: string;
  city: string;
  state: string;
  domains: string[];
  join_method: keyof typeof METHODS;
};

export async function createCollegeWithCode(actor: string, input: CollegeSetupInput) {
  const choice = METHODS[input.join_method];
  const { data, error } = await adminClient().rpc("college_setup_create", {
    p_actor: actor,
    p_code_hash: createHash("sha256").update(input.code, "utf8").digest("hex"),
    p_slug: input.slug,
    p_name: input.name,
    p_short: input.short_name ?? "",
    p_city: input.city,
    p_state: input.state,
    p_domains: input.domains,
    p_methods: choice.methods,
    p_require_approval: choice.approval,
  });
  if (error) throw mapDbError(error);
  return data as { college_id: string; slug: string };
}
