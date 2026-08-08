"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { barberSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/lib/admin/types";

export async function createBarber(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = barberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();
  const { count } = await supabase.from("barbers").select("id", { count: "exact", head: true });

  const { error } = await supabase.from("barbers").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    photo_url: parsed.data.photoUrl || null,
    bio: parsed.data.bio || null,
    specialty: parsed.data.specialty || null,
    whatsapp_number: parsed.data.whatsappNumber,
    is_active: parsed.data.isActive,
    sort_order: count ?? 0,
  });

  if (error) return { ok: false, error: error.message.includes("duplicate") ? "Bu slug zaten kullanılıyor." : "Berber eklenemedi." };
  revalidatePath("/admin/berberler");
  revalidatePath("/berberler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function updateBarber(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = barberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("barbers")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      photo_url: parsed.data.photoUrl || null,
      bio: parsed.data.bio || null,
      specialty: parsed.data.specialty || null,
      whatsapp_number: parsed.data.whatsappNumber,
      is_active: parsed.data.isActive,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Berber güncellenemedi." };
  revalidatePath("/admin/berberler");
  revalidatePath("/berberler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function deleteBarber(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("barbers").delete().eq("id", id);
  if (error) return { ok: false, error: "Berber silinemedi. Randevu geçmişi olan berberleri pasif yapmanız önerilir." };
  revalidatePath("/admin/berberler");
  revalidatePath("/berberler");
  return { ok: true };
}
