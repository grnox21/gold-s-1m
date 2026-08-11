"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { barberSchema, type BarberFormValues } from "@/lib/validations/admin";
import type { Barber } from "@/types/database";
import { createBarber, updateBarber, uploadBarberPhoto } from "@/app/giris/(protected)/berberler/actions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BarberFormDialog({ barber, trigger }: { barber?: Barber; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(barber);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BarberFormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: {
      name: barber?.name ?? "",
      slug: barber?.slug ?? "",
      photoUrl: barber?.photo_url ?? "",
      bio: barber?.bio ?? "",
      specialty: barber?.specialty ?? "",
      whatsappNumber: barber?.whatsapp_number ?? "",
      isActive: barber?.is_active ?? true,
    },
  });
  // useWatch (not form.watch()) — React Compiler can memoize around it.
  const photoUrl = useWatch({ control, name: "photoUrl" });

  async function handlePhotoSelect(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadBarberPhoto(formData);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!result.ok) {
      toast.error(result.error ?? "Fotoğraf yüklenemedi.");
      return;
    }
    setValue("photoUrl", result.url, { shouldValidate: true });
  }

  async function onSubmit(values: BarberFormValues) {
    const result = isEdit ? await updateBarber(barber!.id, values) : await createBarber(values);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success(isEdit ? "Berber güncellendi." : "Berber eklendi.");
    setOpen(false);
    if (!isEdit) reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Berberi Düzenle" : "Yeni Berber Ekle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">İsim</Label>
            <Input
              id="name"
              {...register("name", {
                onChange: (e) => {
                  if (!isEdit) setValue("slug", slugify(e.target.value));
                },
              })}
            />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-xs text-danger">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Uzmanlık</Label>
            <Input id="specialty" placeholder="Klasik Tıraş & Sakal Tasarımı" {...register("specialty")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" {...register("bio")} />
          </div>
          <div className="space-y-2">
            <Label>Fotoğraf</Label>
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface">
                {photoUrl ? (
                  <Image src={photoUrl} alt="" width={64} height={64} className="size-full object-cover" />
                ) : (
                  <User className="size-6 text-ash" strokeWidth={1.5} />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-3.5" /> {uploading ? "Yükleniyor…" : photoUrl ? "Değiştir" : "Fotoğraf Yükle"}
              </Button>
            </div>
            {errors.photoUrl && <p className="text-xs text-danger">{errors.photoUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp Numarası</Label>
            <Input id="whatsappNumber" placeholder="+90 532 000 00 00" {...register("whatsappNumber")} />
            {errors.whatsappNumber && <p className="text-xs text-danger">{errors.whatsappNumber.message}</p>}
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
