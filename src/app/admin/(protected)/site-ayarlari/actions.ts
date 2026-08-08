"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { siteSettingsSchema } from "@/lib/validations/admin";
import type { ActionResult } from "@/lib/admin/types";

export async function saveSiteSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value: value || null }));

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, error: "Ayarlar kaydedilemedi." };

  revalidatePath("/admin/site-ayarlari");
  revalidatePath("/");
  revalidatePath("/iletisim");
  return { ok: true };
}
