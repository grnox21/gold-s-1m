"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { blockedTimeSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/lib/admin/types";

export async function createBlockedTime(input: unknown): Promise<ActionResult> {
  const { admin } = await requireFullAdmin();
  const parsed = blockedTimeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  if (new Date(parsed.data.startAt) >= new Date(parsed.data.endAt)) {
    return { ok: false, error: "Bitiş zamanı başlangıçtan sonra olmalı." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("blocked_times").insert({
    barber_id: parsed.data.barberId || null,
    start_at: new Date(parsed.data.startAt).toISOString(),
    end_at: new Date(parsed.data.endAt).toISOString(),
    reason: parsed.data.reason || null,
    created_by: admin.id,
  });

  if (error) return { ok: false, error: "Engellenen saat eklenemedi." };
  revalidatePath("/giris/engellenen-saatler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function deleteBlockedTime(id: string): Promise<ActionResult> {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("blocked_times").delete().eq("id", id);
  if (error) return { ok: false, error: "Silinemedi." };
  revalidatePath("/giris/engellenen-saatler");
  revalidatePath("/randevu");
  return { ok: true };
}
