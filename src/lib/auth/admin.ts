import "server-only";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { AdminUser } from "@/types/database";

/**
 * Confirms the current request carries both a valid Supabase Auth session
 * AND a matching admin_users row, redirecting to /admin/login otherwise.
 * Use at the top of admin Server Components, layouts, and Server Actions.
 * (Route Handlers under /admin/api, if any are added later, should use
 * this too rather than trusting middleware alone — middleware only proves
 * "logged in", not "is an admin".)
 */
export async function requireAdmin(): Promise<{ userId: string; email: string | null; admin: AdminUser }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const service = createServiceClient();
  const { data: admin } = await service
    .from("admin_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/admin/login?error=yetkisiz");

  return { userId: user.id, email: user.email ?? null, admin: admin as AdminUser };
}
