import type { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/service";
import { requireFullAdmin } from "@/lib/auth/admin";
import type { WhatsAppSettings } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { WhatsappSettingsForm } from "@/components/admin/whatsapp-settings-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "WhatsApp Ayarları" };

export default async function AdminWhatsappSettingsPage() {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.from("whatsapp_settings").select("*").eq("id", 1).maybeSingle();
  const settings = (data as WhatsAppSettings | null) ?? {
    id: 1 as const,
    provider: "click_to_chat" as const,
    phone_number_id: null,
    business_number: null,
    is_enabled: false,
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="max-w-2xl">
      <AdminPageHeading title="WhatsApp Ayarları" description="Randevu bildirimlerinin gönderileceği sağlayıcıyı yapılandırın." />
      <WhatsappSettingsForm settings={settings} />
    </div>
  );
}
