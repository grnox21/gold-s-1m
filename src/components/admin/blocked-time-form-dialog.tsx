"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blockedTimeSchema, type BlockedTimeFormValues } from "@/lib/validations/admin";
import type { Barber } from "@/types/database";
import { createBlockedTime } from "@/app/giris/(protected)/engellenen-saatler/actions";

export function BlockedTimeFormDialog({ barbers, trigger }: { barbers: Barber[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BlockedTimeFormValues>({
    resolver: zodResolver(blockedTimeSchema),
    defaultValues: { barberId: "", startAt: "", endAt: "", reason: "" },
  });

  async function onSubmit(values: BlockedTimeFormValues) {
    const result = await createBlockedTime(values);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success("Saat engellendi.");
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saat Engelle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="barberId">Berber</Label>
            <Controller
              control={control}
              name="barberId"
              render={({ field }) => (
                <Select value={field.value || "all"} onValueChange={(v) => field.onChange(v === "all" ? "" : v)}>
                  <SelectTrigger id="barberId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Berberler</SelectItem>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startAt">Başlangıç</Label>
              <Input id="startAt" type="datetime-local" {...register("startAt")} />
              {errors.startAt && <p className="text-xs text-danger">{errors.startAt.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">Bitiş</Label>
              <Input id="endAt" type="datetime-local" {...register("endAt")} />
              {errors.endAt && <p className="text-xs text-danger">{errors.endAt.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Sebep (opsiyonel)</Label>
            <Input id="reason" placeholder="Kişisel" {...register("reason")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor…" : "Engelle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
