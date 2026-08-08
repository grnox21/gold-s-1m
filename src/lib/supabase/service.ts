import "server-only";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Full-access Supabase client using the service-role key. Bypasses RLS —
 * this is the ONLY client the app uses to read or write data, whether the
 * caller is the public booking flow or the admin dashboard. Authorization
 * for admin actions is enforced in code (see lib/supabase/server.ts +
 * requireAdmin()), never delegated to RLS for this client.
 *
 * `server-only` makes any accidental import from a Client Component fail
 * the build instead of shipping the service key to the browser. Query
 * results are cast to the hand-written types in `types/database.ts` at the
 * call site rather than threading a generated `Database` generic through
 * every call — there's no linked Supabase project in this environment to
 * generate one from, and the migrations are the source of truth.
 */
export function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
