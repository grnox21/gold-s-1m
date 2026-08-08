import { z } from "zod";

// Accepts +905xxxxxxxxx, 05xxxxxxxxx, or 5xxxxxxxxx — anything that
// normalizes to a plausible Turkish mobile number once non-digits are
// stripped. Actual E.164 normalization happens in lib/booking/phone.ts.
const phoneRegex = /^(\+?90|0)?5\d{9}$/;

export const bookingDetailsSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, "Ad soyad en az 3 karakter olmalı.")
    .max(80, "Ad soyad çok uzun."),
  customerPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Geçerli bir telefon numarası girin (örn. 0532 111 22 33)."),
  customerEmail: z
    .string()
    .trim()
    .email("Geçerli bir e-posta adresi girin.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  customerNote: z
    .string()
    .trim()
    .max(500, "Not 500 karakteri geçemez.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export const createAppointmentSchema = z
  .object({
    barberId: z.uuid("Geçersiz berber."),
    serviceIds: z
      .array(z.uuid())
      .min(1, "En az bir hizmet seçmelisiniz.")
      .max(8, "En fazla 8 hizmet seçebilirsiniz."),
    startAt: z.iso.datetime({ offset: true }).or(z.iso.datetime()),
  })
  .extend(bookingDetailsSchema.shape);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const availabilityQuerySchema = z.object({
  barberId: z.uuid("Geçersiz berber."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih formatı."),
  serviceIds: z.array(z.uuid()).min(1, "En az bir hizmet seçmelisiniz."),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
