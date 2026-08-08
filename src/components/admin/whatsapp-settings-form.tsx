"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { whatsappSettingsSchema, type WhatsappSettingsFormValues } from "@/lib/validations/admin";
import type { WhatsAppSettings } from "@/types/database";
import { saveWhatsappSettings, sendTestWhatsappMessage } from "@/app/giris/(protected)/whatsapp-ayarlari/actions";

const PROVIDER_LABELS: Record<string, string> = {
  click_to_chat: "Click-to-Chat (varsayılan)",
  meta_cloud: "Meta WhatsApp Cloud API",
  twilio: "Twilio WhatsApp",
};

export function WhatsappSettingsForm({ settings }: { settings: WhatsAppSettings }) {
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<WhatsappSettingsFormValues>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      provider: settings.provider,
      phoneNumberId: settings.phone_number_id ?? "",
      businessNumber: settings.business_number ?? "",
      isEnabled: settings.is_enabled,
    },
  });

  // useWatch (not form.watch()) — React Compiler can memoize around it.
  const provider = useWatch({ control, name: "provider" });

  async function onSubmit(values: WhatsappSettingsFormValues) {
    const result = await saveWhatsappSettings(values);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success("WhatsApp ayarları kaydedildi.");
  }

  async function handleTest() {
    setTesting(true);
    const result = await sendTestWhatsappMessage(testPhone);
    setTesting(false);
    if (result.ok) toast.success("Test mesajı gönderildi.");
    else toast.error(result.error ?? "Test mesajı gönderilemedi.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Sağlayıcı</CardTitle>
            <CardDescription>
              Gerçek kimlik bilgileri (API token, hesap SID vb.) yalnızca sunucu ortam değişkenlerinde saklanır —
              burada görüntülenmez veya düzenlenmez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Sağlayıcı</Label>
              <Controller
                control={control}
                name="provider"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {provider !== "click_to_chat" && (
                <p className="text-xs text-ash">
                  Bu sağlayıcıyı kullanmak için ilgili ortam değişkenlerinin (.env.example dosyasına bakın) sunucuda
                  tanımlı olması gerekir. Tanımlı değilse sistem otomatik olarak click-to-chat&apos;e döner.
                </p>
              )}
            </div>

            {provider === "meta_cloud" && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input id="phoneNumberId" {...register("phoneNumberId")} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="businessNumber">İşletme WhatsApp Numarası</Label>
              <Input id="businessNumber" placeholder="+90 532 000 00 00" {...register("businessNumber")} />
            </div>

            <div className="flex items-center justify-between rounded-sm border border-border-strong px-4 py-3">
              <Label htmlFor="isEnabled" className="text-foreground normal-case tracking-normal text-sm">
                Otomatik bildirimler etkin
              </Label>
              <Controller
                control={control}
                name="isEnabled"
                render={({ field }) => <Switch id="isEnabled" checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Test Mesajı Gönder</CardTitle>
          <CardDescription>Yapılandırmayı doğrulamak için bir numaraya test mesajı gönderin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-2">
            <Label htmlFor="testPhone">Telefon Numarası</Label>
            <Input id="testPhone" placeholder="+90 532 000 00 00" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? "Gönderiliyor…" : "Test Mesajı Gönder"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
