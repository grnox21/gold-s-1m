"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { serviceSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/lib/admin/types";

export async function createService(input: unknown): Promise<ActionResult> {
  await requireFullAdmin();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();
  const { count } = await supabase.from("services").select("id", { count: "exact", head: true });

  const { error } = await supabase.from("services").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parsed.data.price,
    duration_minutes: parsed.data.durationMinutes,
    is_active: parsed.data.isActive,
    sort_order: count ?? 0,
  });

  if (error) return { ok: false, error: "Hizmet eklenemedi." };
  revalidatePath("/admin/hizmetler");
  revalidatePath("/hizmetler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function updateService(id: string, input: unknown): Promise<ActionResult> {
  await requireFullAdmin();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      duration_minutes: parsed.data.durationMinutes,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Hizmet güncellenemedi." };
  revalidatePath("/admin/hizmetler");
  revalidatePath("/hizmetler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { ok: false, error: "Hizmet silinemedi. Geçmiş randevularda kullanılan hizmetleri pasif yapmanız önerilir." };
  revalidatePath("/admin/hizmetler");
  revalidatePath("/hizmetler");
  return { ok: true };
}
