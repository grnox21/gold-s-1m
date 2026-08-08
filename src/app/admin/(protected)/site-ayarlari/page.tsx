import type { Metadata } from "next";

import { getSiteSettings } from "@/lib/site-data";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Site Ayarları" };

export default async function AdminSiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="max-w-2xl">
      <AdminPageHeading title="Site Ayarları" description="Herkese açık sitede görünen iletişim ve SEO bilgileri." />
      <SiteSettingsForm settings={settings} />
    </div>
  );
}
