"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { barberLoginSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/lib/admin/types";

/**
 * Owner-facing "create a dashboard login for this barber" action — the
 * self-service alternative to what was previously a manual, three-step
 * Supabase-dashboard-plus-SQL process. Creates the Supabase Auth user via
 * the Admin API (service-role only) and links it with a 'barber'-role
 * admin_users row in one go, rolling the auth user back if the link fails
 * so we never leave an orphaned, unlinked login behind.
 */
export async function createBarberLogin(barberId: string, barberName: string, input: unknown): Promise<ActionResult> {
  await requireFullAdmin();
  const parsed = barberLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    const message = createError?.message ?? "";
    return {
      ok: false,
      error: message.toLowerCase().includes("already been registered") ? "Bu e-posta zaten kayıtlı." : "Hesap oluşturulamadı.",
    };
  }

  const { error: linkError } = await supabase.from("admin_users").insert({
    auth_user_id: created.user.id,
    full_name: barberName,
    role: "barber",
    barber_id: barberId,
  });
  if (linkError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "Hesap oluşturuldu ama berbere bağlanamadı. Tekrar deneyin." };
  }

  revalidatePath("/giris/berberler");
  return { ok: true };
}

/**
 * admin_users.auth_user_id has ON DELETE CASCADE, so deleting the auth
 * user here also removes its admin_users row — one call undoes both
 * halves of createBarberLogin above.
 */
export async function deleteBarberLogin(authUserId: string): Promise<ActionResult> {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(authUserId);
  if (error) return { ok: false, error: "Hesap silinemedi." };
  revalidatePath("/giris/berberler");
  return { ok: true };
}
