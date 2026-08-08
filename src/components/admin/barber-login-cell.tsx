"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { barberLoginSchema, type BarberLoginFormValues } from "@/lib/validations/admin";
import { createBarberLogin, deleteBarberLogin } from "@/app/giris/(protected)/berberler/login-actions";
import type { Barber } from "@/types/database";

export function BarberLoginCell({ barber, login }: { barber: Barber; login: { authUserId: string; email: string | null } | null }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BarberLoginFormValues>({
    resolver: zodResolver(barberLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: BarberLoginFormValues) {
    const result = await createBarberLogin(barber.id, barber.name, values);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success("Giriş hesabı oluşturuldu.");
    setCreateOpen(false);
    reset();
  }

  async function handleDelete() {
    if (!login) return;
    setDeleting(true);
    const result = await deleteBarberLogin(login.authUserId);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Giriş hesabı kaldırıldı.");
    setConfirmDeleteOpen(false);
  }

  if (login) {
    return (
      <div className="flex items-center gap-2">
        <span className="truncate text-xs text-ash">{login.email ?? "—"}</span>
        <Button variant="ghost" size="icon" className="size-7 shrink-0 text-ash hover:text-danger" onClick={() => setConfirmDeleteOpen(true)}>
          <Trash2 className="size-3.5" />
        </Button>

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Giriş hesabı kaldırılsın mı?</DialogTitle>
              <DialogDescription>
                {barber.name} artık `/giris/login`&apos;dan giriş yapamayacak. Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Vazgeç</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Kaldırılıyor…" : "Evet, Kaldır"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog
      open={createOpen}
      onOpenChange={(next) => {
        setCreateOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="size-3.5" /> Giriş Hesabı Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{barber.name} için Giriş Hesabı</DialogTitle>
          <DialogDescription>
            Bu berber `/giris/login`&apos;dan bu bilgilerle giriş yapıp sadece kendi randevularını görebilecek.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`login-email-${barber.id}`}>E-posta</Label>
            <Input id={`login-email-${barber.id}`} type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`login-password-${barber.id}`}>Şifre</Label>
            <Input id={`login-password-${barber.id}`} type="password" {...register("password")} />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Oluşturuluyor…" : "Hesap Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
