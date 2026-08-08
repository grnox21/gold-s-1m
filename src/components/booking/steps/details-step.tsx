"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { bookingDetailsSchema } from "@/lib/validations/booking";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepNav } from "../step-nav";
import type { z } from "zod";

// zod's .transform() on the optional fields means the schema's input shape
// (what the form fields hold) and output shape (what onSubmit receives)
// differ slightly — react-hook-form's third generic lets the resolver
// bridge the two instead of fighting a single inferred type.
type FormInput = z.input<typeof bookingDetailsSchema>;
type FormOutput = z.output<typeof bookingDetailsSchema>;

export function DetailsStep({
  defaultValues,
  onBack,
  onSubmit,
  submitting,
}: {
  defaultValues: Partial<FormInput>;
  onBack: () => void;
  onSubmit: (values: FormOutput) => void;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1 className="font-display text-2xl text-warm-white sm:text-3xl">Bilgilerinizi girin</h1>
      <p className="mt-2 text-sm text-ash">Randevunuzu onaylamak için iletişim bilgilerinize ihtiyacımız var.</p>

      <div className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="customerName">Ad Soyad *</Label>
          <Input id="customerName" placeholder="Ahmet Yılmaz" {...register("customerName")} />
          {errors.customerName && <p className="text-xs text-danger">{errors.customerName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerPhone">Telefon *</Label>
          <Input id="customerPhone" type="tel" placeholder="0532 111 22 33" {...register("customerPhone")} />
          {errors.customerPhone && <p className="text-xs text-danger">{errors.customerPhone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail">E-posta (opsiyonel)</Label>
          <Input id="customerEmail" type="email" placeholder="ornek@eposta.com" {...register("customerEmail")} />
          {errors.customerEmail && <p className="text-xs text-danger">{errors.customerEmail.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerNote">Not (opsiyonel)</Label>
          <Textarea id="customerNote" placeholder="Eklemek istediğiniz bir not var mı?" {...register("customerNote")} />
          {errors.customerNote && <p className="text-xs text-danger">{errors.customerNote.message}</p>}
        </div>
      </div>

      <StepNav onBack={onBack} nextLabel="Devam Et" nextLoading={submitting} onNext={handleSubmit(onSubmit)} />
    </form>
  );
}
