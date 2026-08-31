import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { Barber, Service, SiteSetting } from "@/types/database";

export async function getActiveBarbers(): Promise<Barber[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("barbers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Barber[];
}

export async function getBarberBySlug(slug: string): Promise<Barber | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("barbers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Barber | null) ?? null;
}

export async function getActiveServices(): Promise<Service[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Service[];
}

export type SiteSettingsMap = Record<string, string>;

// Exported so lib/email/notify.ts can reuse owner_notification_email's
// default without a second Supabase client (it already has one passed in).
export const SETTINGS_DEFAULTS: SiteSettingsMap = {
  address: "Adres bilgisi admin panelinden eklenecek",
  phone: "+90 000 000 00 00",
  whatsapp_display_number: "+90 000 000 00 00",
  instagram_url: "",
  google_maps_url: "",
  opening_hours_note: "Pazartesi–Perşembe 09:00–20:00 · Cuma–Cumartesi 09:00–22:00 · Pazar kapalı",
  // Where lib/email/notify.ts sends "yeni randevu" / "30 dakika kaldı"
  // notices for the shop owner (distinct from the WhatsApp settings,
  // which are barber/customer-facing). A real default, not a placeholder
  // like the ones above — set at the owner's request — so it works with
  // no site_settings row needed; editable later from Site Ayarları.
  owner_notification_email: "yusufdemirshop@gmail.com",
  meta_title: "Yusuf Demir Erkek Kuaförü | Premium Erkek Kuaförü",
  meta_description:
    "Yusuf Demir Erkek Kuaförü'nde saç kesimi, sakal tıraşı ve VIP bakım hizmetlerinde premium deneyim. Online randevunuzu hemen oluşturun.",
};

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("site_settings").select("*");
  const map = { ...SETTINGS_DEFAULTS };
  for (const row of (data ?? []) as SiteSetting[]) {
    if (row.value) map[row.key] = row.value;
  }
  return map;
}
