"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { serviceSchema } from "@/lib/validations/admin";
import type { z } from "zod";
import type { Service } from "@/types/database";
import { createService, updateService } from "@/app/giris/(protected)/hizmetler/actions";

// price/durationMinutes use z.coerce, so the raw form input type (what
// register() manages) differs from the coerced output type onSubmit
// receives — see the same pattern in booking/steps/details-step.tsx.
type ServiceFormInput = z.input<typeof serviceSchema>;
type ServiceFormOutput = z.output<typeof serviceSchema>;

export function ServiceFormDialog({ service, trigger }: { service?: Service; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(service);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ServiceFormInput, unknown, ServiceFormOutput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      price: service?.price ?? 0,
      durationMinutes: service?.duration_minutes ?? 30,
      isActive: service?.is_active ?? true,
    },
  });

  async function onSubmit(values: ServiceFormOutput) {
    const result = isEdit ? await updateService(service!.id, values) : await createService(values);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success(isEdit ? "Hizmet güncellendi." : "Hizmet eklendi.");
    setOpen(false);
    if (!isEdit) reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Hizmeti Düzenle" : "Yeni Hizmet Ekle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Hizmet Adı</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Fiyat (₺)</Label>
              {/* type="text" + inputMode, not type="number": a native
                  number input renders its digits in the browser/OS's
                  locale — on an Arabic browser/system locale that's
                  Eastern Arabic-Indic numerals (٠١٢), regardless of this
                  page's lang="tr". Plain text always renders the digits
                  you actually typed. Validation (min, integer, step-of-15)
                  is enforced by serviceSchema either way. */}
              <Input id="price" type="text" inputMode="decimal" {...register("price")} />
              {errors.price && <p className="text-xs text-danger">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Süre (dk)</Label>
              <Input id="durationMinutes" type="text" inputMode="numeric" {...register("durationMinutes")} />
              {errors.durationMinutes && <p className="text-xs text-danger">{errors.durationMinutes.message}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border-strong px-4 py-3">
            <Label htmlFor="isActive" className="text-foreground normal-case tracking-normal text-sm">
              Aktif (sitede görünür)
            </Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
