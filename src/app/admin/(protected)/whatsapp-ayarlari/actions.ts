"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { whatsappSettingsSchema } from "@/lib/validations/admin";
import { createWhatsAppProvider } from "@/lib/whatsapp/factory";
import type { ActionResult } from "@/lib/admin/types";

export async function saveWhatsappSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = whatsappSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("whatsapp_settings")
    .update({
      provider: parsed.data.provider,
      phone_number_id: parsed.data.phoneNumberId || null,
      business_number: parsed.data.businessNumber || null,
      is_enabled: parsed.data.isEnabled,
    })
    .eq("id", 1);

  if (error) return { ok: false, error: "Ayarlar kaydedilemedi." };
  revalidatePath("/admin/whatsapp-ayarlari");
  return { ok: true };
}

export async function sendTestWhatsappMessage(phone: string): Promise<ActionResult> {
  await requireAdmin();
  if (!phone.trim()) return { ok: false, error: "Telefon numarası girin." };

  const supabase = createServiceClient();
  const { data: settings } = await supabase.from("whatsapp_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings) return { ok: false, error: "WhatsApp ayarları bulunamadı." };

  const provider = createWhatsAppProvider(settings);
  const result = await provider.sendMessage(
    phone,
    "Bu, Yusuf Demir Erkek Kuaförü randevu sisteminden gönderilen bir test mesajıdır."
  );

  if (result.status === "sent") return { ok: true };
  if (result.status === "skipped") {
    return { ok: false, error: "Gerçek bir sağlayıcı yapılandırılmamış — click-to-chat bağlantısı üretildi ama otomatik gönderim yapılmadı." };
  }
  return { ok: false, error: result.error };
}
