"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteSettingsSchema, type SiteSettingsFormValues } from "@/lib/validations/admin";
import type { SiteSettingsMap } from "@/lib/site-data";
import { saveSiteSettings } from "@/app/giris/(protected)/site-ayarlari/actions";

export function SiteSettingsForm({ settings }: { settings: SiteSettingsMap }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: settings,
  });

  async function onSubmit(values: SiteSettingsFormValues) {
    const result = await saveSiteSettings(values);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success("Site ayarları kaydedildi.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>İletişim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Adres" htmlFor="address">
            <Textarea id="address" {...register("address")} />
          </Field>
          <Field label="Telefon" htmlFor="phone">
            <Input id="phone" {...register("phone")} />
          </Field>
          <Field label="WhatsApp Görünen Numara" htmlFor="whatsapp_display_number">
            <Input id="whatsapp_display_number" {...register("whatsapp_display_number")} />
          </Field>
          <Field label="Instagram URL" htmlFor="instagram_url">
            <Input id="instagram_url" placeholder="https://instagram.com/…" {...register("instagram_url")} />
          </Field>
          <Field label="Google Maps Embed URL" htmlFor="google_maps_url">
            <Input id="google_maps_url" placeholder="https://www.google.com/maps/embed?…" {...register("google_maps_url")} />
          </Field>
          <Field label="Çalışma Saatleri Notu" htmlFor="opening_hours_note">
            <Input id="opening_hours_note" {...register("opening_hours_note")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Meta Başlık" htmlFor="meta_title">
            <Input id="meta_title" {...register("meta_title")} />
          </Field>
          <Field label="Meta Açıklama" htmlFor="meta_description">
            <Textarea id="meta_description" {...register("meta_description")} />
          </Field>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
