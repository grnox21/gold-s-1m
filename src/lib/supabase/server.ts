import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Anon-key client bound to the request's cookies. Used ONLY to answer "who
 * is logged in" (Supabase Auth) in Server Components, Server Actions and
 * Route Handlers under /giris — never for reading or writing app data
 * (that's always createServiceClient()).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component with no response to write to —
          // middleware (src/middleware.ts) refreshes the session instead.
        }
      },
    },
  });
}
