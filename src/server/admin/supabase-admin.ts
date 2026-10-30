import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// SERVICE ROLE client. It ignores Row Level Security.
// Import it only from src/server/admin/** or from files named *.admin.ts (ESLint enforces this).
// Never use it to read or write data on behalf of a user without checking that user first.
let client: SupabaseClient | undefined;

export function adminClient(): SupabaseClient {
  if (!client) {
    const env = serverEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
