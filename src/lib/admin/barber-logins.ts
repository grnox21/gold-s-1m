import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

export interface BarberLoginInfo {
  barberId: string;
  authUserId: string;
  email: string | null;
}

/**
 * admin_users only stores auth_user_id (public schema) — the email itself
 * lives in Supabase's internal auth.users table, not reachable through the
 * normal postgrest `.from()` query, so it's fetched separately via the
 * Admin Auth API and joined here in application code.
 */
export async function getBarberLogins(): Promise<BarberLoginInfo[]> {
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("admin_users")
    .select("auth_user_id, barber_id")
    .eq("role", "barber")
    .not("barber_id", "is", null);

  const links = (rows ?? []) as { auth_user_id: string; barber_id: string }[];
  if (links.length === 0) return [];

  const { data: usersPage } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map((usersPage?.users ?? []).map((u) => [u.id, u.email ?? null]));

  return links.map((l) => ({
    barberId: l.barber_id,
    authUserId: l.auth_user_id,
    email: emailById.get(l.auth_user_id) ?? null,
  }));
}
