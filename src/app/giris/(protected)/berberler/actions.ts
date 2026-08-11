"use server";

import { revalidatePath } from "next/cache";

import { requireFullAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { uploadImageToBucket } from "@/lib/gallery-storage";
import { barberSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/lib/admin/types";

/** Backs the "Fotoğraf Yükle" control in BarberFormDialog — replaces what
 * used to be a paste-a-URL field. Uploads into the same 'gallery' Storage
 * bucket the Görseller page uses (see lib/gallery-storage.ts), just under
 * a barbers/ prefix, and hands back the public URL the form then submits
 * as photo_url like before — no schema change needed on the barbers
 * table. */
export async function uploadBarberPhoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireFullAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bir görsel seçin." };
  }

  return uploadImageToBucket(file, "barbers");
}

export async function createBarber(input: unknown): Promise<ActionResult> {
  await requireFullAdmin();
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
  revalidatePath("/giris/berberler");
  revalidatePath("/berberler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function updateBarber(id: string, input: unknown): Promise<ActionResult> {
  await requireFullAdmin();
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
  revalidatePath("/giris/berberler");
  revalidatePath("/berberler");
  revalidatePath("/randevu");
  return { ok: true };
}

export async function deleteBarber(id: string): Promise<ActionResult> {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("barbers").delete().eq("id", id);
  if (error) return { ok: false, error: "Berber silinemedi. Randevu geçmişi olan berberleri pasif yapmanız önerilir." };
  revalidatePath("/giris/berberler");
  revalidatePath("/berberler");
  return { ok: true };
}
